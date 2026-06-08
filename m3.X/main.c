#include "mcc_generated_files/mcc.h"
#include <stdlib.h>
#include <string.h>

#define VDD_MV          5000
#define FB_ADC_0        4057
#define FB_ADC_360      0
#define PWM_MAX         100
#define PID_SCALE       100
#define KP_MAX          200
#define KI_MAX          100
#define KD_MAX          100
#define OUTPUT_MAX_DELTA 5
#define DIR_HYSTERESIS   10
#define SP_MIN_DEG      10
#define SP_MAX_DEG      350
#define INTEGRAL_MAX    800
#define INTEGRAL_MIN    -800
#define ERROR_DEADBAND  2
#define PWM_MIN         40
#define BRAKE_CYCLES    40
#define DIR_SETTLE_CYCLES 3
#define TX_BUF_SIZE     56
#define RX_BUF_SIZE     32
#define TICK_RX_TIMEOUT 20000

volatile int16_t kp_val = 35;
volatile int16_t ki_val = 10;
volatile int16_t kd_val = 0;

static volatile int32_t integral = 0;
static int16_t prev_error = 0;
static int32_t prev_scaled = 0;
static int16_t prev_fb_deg = 0;
static int16_t last_dir = 0;

typedef enum { IDLE, HOMING, SWEEP } state_t;
static state_t system_state = IDLE;
static int16_t target_angle = 180;
static int16_t sweep_dir = 1;
static uint8_t sweep_tick = 0;

typedef enum { DRV_ACTIVE, DRV_COOLDOWN, DRV_DIR_SETTLE } drv_state_t;
static drv_state_t drv_state = DRV_ACTIVE;
static uint8_t drv_counter = 0;
static int8_t pending_dir = 0;

static volatile int16_t tel_angle = 0;
static volatile int16_t tel_target = 0;
static volatile uint8_t tel_state = IDLE;
static volatile bool tel_ready = false;

static char tx_buf[TX_BUF_SIZE];
static uint8_t tx_len = 0;
static uint8_t tx_idx = 0;

static int16_t adc_to_degrees(uint16_t raw)
{
    int32_t range = (int32_t)FB_ADC_360 - (int32_t)FB_ADC_0;
    if (range == 0) return 0;
    return (int16_t)((int32_t)((int16_t)raw - FB_ADC_0) * 360 / range);
}

static int16_t clamp16(int16_t v, int16_t lo, int16_t hi)
{
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

static void int_to_str(int16_t v, char *buf, uint8_t size)
{
    uint8_t i = 0;
    if (v < 0) { buf[i++] = '-'; v = -v; }
    uint8_t d[6], n = 0;
    if (v == 0) { d[n++] = 0; } else {
        while (v > 0 && n < 6) { d[n++] = (uint8_t)(v % 10); v /= 10; }
    }
    for (int8_t j = (int8_t)n - 1; j >= 0; j--) buf[i++] = d[j] + '0';
    buf[i] = '\0';
}

static void PID_ISR(void)
{
    int16_t kp = kp_val, ki = ki_val, kd = kd_val;

    uint16_t fb_raw = ADCC_GetSingleConversion(FEEDBACK);
    int16_t fb_deg = adc_to_degrees(fb_raw);

    int16_t sp_deg;
    if (system_state == SWEEP) {
        sweep_tick++;
        if (sweep_tick >= 2) {
            sweep_tick = 0;
            target_angle += sweep_dir;
            if (target_angle >= SP_MAX_DEG) { target_angle = SP_MAX_DEG; sweep_dir = -1; }
            else if (target_angle <= SP_MIN_DEG) { target_angle = SP_MIN_DEG; sweep_dir = 1; }
        }
        sp_deg = target_angle;
    } else if (system_state == HOMING) {
        sp_deg = SP_MIN_DEG;
    } else {
        sp_deg = target_angle;
    }

    int16_t err = sp_deg - fb_deg;

    if (drv_state == DRV_COOLDOWN) {
        PWM6_LoadDutyValue(0);
        drv_counter--;
        if (drv_counter == 0) {
            if (pending_dir > 0) DIR_SetHigh();
            else DIR_SetLow();
            last_dir = pending_dir;
            drv_state = DRV_DIR_SETTLE;
            drv_counter = DIR_SETTLE_CYCLES;
        }
        prev_fb_deg = fb_deg;
        prev_error = err;
        tel_angle = fb_deg;
        tel_target = sp_deg;
        tel_state = (uint8_t)system_state;
        tel_ready = true;
        return;
    }

    if (drv_state == DRV_DIR_SETTLE) {
        PWM6_LoadDutyValue(0);
        drv_counter--;
        if (drv_counter == 0) {
            drv_state = DRV_ACTIVE;
            prev_scaled = 0;
        }
        prev_fb_deg = fb_deg;
        prev_error = err;
        tel_angle = fb_deg;
        tel_target = sp_deg;
        tel_state = (uint8_t)system_state;
        tel_ready = true;
        return;
    }

    if (err > -ERROR_DEADBAND && err < ERROR_DEADBAND) {
        prev_fb_deg = fb_deg;
        prev_error = err;
        PWM6_LoadDutyValue(0);
        prev_scaled = 0;
        integral = 0;
        if (system_state == HOMING) system_state = IDLE;
        tel_angle = fb_deg;
        tel_target = sp_deg;
        tel_state = (uint8_t)system_state;
        tel_ready = true;
        return;
    }

    int16_t deriv = -(fb_deg - prev_fb_deg);
    prev_fb_deg = fb_deg;
    prev_error = err;

    int32_t output = (int32_t)kp * err + (int32_t)ki * integral + (int32_t)kd * deriv;
    int32_t scaled = output / PID_SCALE;

    int32_t delta = scaled - prev_scaled;
    if (delta > OUTPUT_MAX_DELTA) scaled = prev_scaled + OUTPUT_MAX_DELTA;
    else if (delta < -OUTPUT_MAX_DELTA) scaled = prev_scaled - OUTPUT_MAX_DELTA;

    if (scaled > PWM_MAX) scaled = PWM_MAX;
    if (scaled < -PWM_MAX) scaled = -PWM_MAX;

    int16_t duty_sign = (scaled > DIR_HYSTERESIS) ? 1 : (scaled < -DIR_HYSTERESIS) ? -1 : 0;

    if (!((scaled >= PWM_MAX && err > 0) || (scaled <= -PWM_MAX && err < 0))) {
        integral += err;
        if (integral > INTEGRAL_MAX) integral = INTEGRAL_MAX;
        if (integral < INTEGRAL_MIN) integral = INTEGRAL_MIN;
    }

    prev_scaled = scaled;

    if (duty_sign != 0 && last_dir != 0 && duty_sign != last_dir) {
        PWM6_LoadDutyValue(0);
        prev_scaled = 0;
        pending_dir = (int8_t)duty_sign;
        drv_state = DRV_COOLDOWN;
        drv_counter = BRAKE_CYCLES;
        prev_fb_deg = fb_deg;
        prev_error = err;
        tel_angle = fb_deg;
        tel_target = sp_deg;
        tel_state = (uint8_t)system_state;
        tel_ready = true;
        return;
    }

    if (duty_sign != 0) last_dir = duty_sign;

    int16_t duty = (int16_t)scaled;
    if (duty < 0) duty = -duty;
    PWM6_LoadDutyValue((uint16_t)duty);

    tel_angle = fb_deg;
    tel_target = sp_deg;
    tel_state = (uint8_t)system_state;
    tel_ready = true;
}

static const char *state_str(uint8_t s)
{
    switch ((state_t)s) {
        case HOMING: return "HOMING";
        case SWEEP:  return "SWEEP";
        default:     return "IDLE";
    }
}

static void tx_prepare(void)
{
    uint8_t len = 0;
    char tmp[8];

    tx_buf[len++] = 'A'; tx_buf[len++] = 'N'; tx_buf[len++] = 'G'; tx_buf[len++] = ':';

    int_to_str(tel_angle, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i]; i++) tx_buf[len++] = tmp[i];

    tx_buf[len++] = ','; tx_buf[len++] = ' ';
    tx_buf[len++] = 'T'; tx_buf[len++] = 'A'; tx_buf[len++] = 'R';
    tx_buf[len++] = 'G'; tx_buf[len++] = 'E'; tx_buf[len++] = 'T'; tx_buf[len++] = ':';

    int_to_str(tel_target, tmp, sizeof(tmp));
    for (uint8_t i = 0; tmp[i]; i++) tx_buf[len++] = tmp[i];

    tx_buf[len++] = ','; tx_buf[len++] = ' ';
    tx_buf[len++] = 'S'; tx_buf[len++] = 'T'; tx_buf[len++] = 'A';
    tx_buf[len++] = 'T'; tx_buf[len++] = 'E'; tx_buf[len++] = ':';

    const char *s = state_str(tel_state);
    for (uint8_t i = 0; s[i]; i++) tx_buf[len++] = s[i];

    tx_buf[len++] = '\r'; tx_buf[len++] = '\n';
    tx_len = len;
    tx_idx = 0;
}

static void request_dir_change(int8_t new_dir)
{
    if (last_dir == 0 || new_dir == last_dir) {
        last_dir = new_dir;
        if (new_dir > 0) DIR_SetHigh();
        else DIR_SetLow();
        drv_state = DRV_ACTIVE;
        prev_scaled = 0;
        return;
    }
    pending_dir = new_dir;
    drv_state = DRV_COOLDOWN;
    drv_counter = BRAKE_CYCLES;
    prev_scaled = 0;
    INTCONbits.GIE = 0;
    integral = 0;
    INTCONbits.GIE = 1;
    PWM6_LoadDutyValue(0);
}

static void parse_cmd(const char *cmd)
{
    if (strcmp(cmd, "HOME") == 0) {
        INTCONbits.GIE = 0;
        integral = 0;
        INTCONbits.GIE = 1;
        system_state = HOMING;
        request_dir_change(-1);
    } else if (strcmp(cmd, "START") == 0) {
        INTCONbits.GIE = 0;
        integral = 0;
        INTCONbits.GIE = 1;
        system_state = SWEEP;
        sweep_dir = 1;
        sweep_tick = 0;
    } else if (strcmp(cmd, "STOP") == 0) {
        INTCONbits.GIE = 0;
        integral = 0;
        INTCONbits.GIE = 1;
        system_state = IDLE;
        target_angle = tel_angle;
        PWM6_LoadDutyValue(0);
    } else if (strcmp(cmd, "M114") == 0) {
        // Forces next telemetry frame — handled naturally by ISR
    } else if (cmd[0] == 'G' && cmd[1] == '0') {
        INTCONbits.GIE = 0;
        integral = 0;
        INTCONbits.GIE = 1;
        char *x = strchr(cmd, 'X');
        if (x) {
            x++;
            if (*x == '+') { target_angle += (int16_t)atoi(x + 1); }
            else if (*x == '-') { target_angle -= (int16_t)atoi(x + 1); }
            else { target_angle = (int16_t)atoi(x); }
            target_angle = clamp16(target_angle, SP_MIN_DEG, SP_MAX_DEG);
            system_state = IDLE;
            int16_t delta = target_angle - tel_angle;
            if (delta < 0) request_dir_change(-1);
            else if (delta > 0) request_dir_change(1);
        }
    } else if (cmd[0] == 'P') {
        int16_t v = (int16_t)atoi(cmd + 1);
        if (v >= 0 && v <= KP_MAX) { INTCONbits.GIE = 0; kp_val = v; INTCONbits.GIE = 1; }
    } else if (cmd[0] == 'I') {
        int16_t v = (int16_t)atoi(cmd + 1);
        if (v >= 0 && v <= KI_MAX) { INTCONbits.GIE = 0; ki_val = v; INTCONbits.GIE = 1; }
    } else if (cmd[0] == 'D') {
        int16_t v = (int16_t)atoi(cmd + 1);
        if (v >= 0 && v <= KD_MAX) { INTCONbits.GIE = 0; kd_val = v; INTCONbits.GIE = 1; }
    }
}

void main(void)
{
    SYSTEM_Initialize();
    ADREF = 0x00;
    INTERRUPT_GlobalInterruptEnable();
    INTERRUPT_PeripheralInterruptEnable();
    TMR0_SetInterruptHandler(PID_ISR);

    DIR_SetLow();

    char rx_buf[RX_BUF_SIZE];
    uint8_t rx_idx = 0;
    uint16_t rx_timeout = 0;

    while (1) {
        while (EUSART1_is_rx_ready()) {
            char c = EUSART1_Read();
            rx_timeout = 0;
            if (c == '\n' || c == '\r') {
                if (rx_idx > 0) {
                    rx_buf[rx_idx] = '\0';
                    parse_cmd(rx_buf);
                    rx_idx = 0;
                }
            } else {
                if (rx_idx < RX_BUF_SIZE - 1) rx_buf[rx_idx++] = c;
            }
        }

        if (rx_idx > 0) {
            rx_timeout++;
            if (rx_timeout >= TICK_RX_TIMEOUT) {
                rx_idx = 0;
                rx_timeout = 0;
            }
        }

        if (tel_ready) {
            tel_ready = false;
            tx_prepare();
        }

        if (tx_idx < tx_len && EUSART1_is_tx_ready()) {
            EUSART1_Write(tx_buf[tx_idx++]);
        }
    }
}
