#include "mcc_generated_files/mcc.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <xc.h>

typedef enum { IDLE, HOMING, MOVE, SWEEP, STOP } system_state_t;
volatile system_state_t state = IDLE;

volatile long current_position = 0;
volatile long target_position = 0;

volatile uint8_t dir = 0;
volatile uint8_t motor_enable = 0;
volatile uint8_t report_position_flag = 0;

char rx_buffer[32];
uint8_t rx_index = 0;

#define STEPS_PER_MM 40

static long max_speed_mm_min = 1000;

typedef enum { RAMP_IDLE, RAMP_ACCEL, RAMP_CRUISE, RAMP_DECEL } ramp_state_t;

volatile ramp_state_t ramp_state = RAMP_IDLE;
volatile long ramp_start_pos = 0;
volatile long ramp_total_steps = 0;
volatile long ramp_accel_steps = 0;
volatile long ramp_decel_steps = 0;

volatile unsigned long current_freq = 400;
volatile unsigned long target_freq = 1500;
volatile unsigned long start_freq = 900;
volatile unsigned long accel_divisor = 2;

volatile uint8_t sweep_dir = 1;
volatile uint8_t homing_first = 1;

void UART_SendString(const char *str) {
    while (*str) EUSART1_Write(*str++);
}

static void nco_set_freq(unsigned long freq_hz) {
    unsigned long increment = (freq_hz * 1048576UL) / 32000000UL;
    if (increment == 0) increment = 1;

    NCO1INCL = (uint8_t)(increment & 0xFF);
    NCO1INCH = (uint8_t)((increment >> 8) & 0xFF);
    NCO1INCU = (uint8_t)((increment >> 16) & 0xFF);
}

void motor_start(void) {
    NCO1CONbits.EN = 1;
    motor_enable = 1;
}

void motor_stop(void) {
    NCO1CONbits.EN = 0;
    motor_enable = 0;
}

static long position_get_atomic(void) {
    long pos;
    uint8_t gie_state = INTCONbits.GIE;
    INTERRUPT_GlobalInterruptDisable();
    pos = current_position;
    if (gie_state) INTERRUPT_GlobalInterruptEnable();
    return pos;
}

static void UART_SendPosition(void) {
    char tx_buffer[40];
    long pos_steps = position_get_atomic();
    long pos_mm = pos_steps / STEPS_PER_MM;
    const char *state_str;

    switch (state) {
        case IDLE:   state_str = "IDLE"; break;
        case HOMING: state_str = "HOME"; break;
        case MOVE:   state_str = "SCAN"; break;
        case SWEEP:  state_str = "SCAN"; break;
        case STOP:   state_str = "STOP"; break;
        default:     state_str = "IDLE"; break;
    }

    sprintf(tx_buffer, "ANG:%ld.%02ld, STATE:%s\r\n",
            labs(pos_mm), (long)((labs(pos_steps) * 100L / STEPS_PER_MM) % 100),
            state_str);
    UART_SendString(tx_buffer);
}

static void TMR2_ReportPositionISR(void) {
    report_position_flag = 1;
}

static void setup_ramp(long from_steps, long to_steps) {
    ramp_start_pos = from_steps;
    ramp_total_steps = labs(to_steps - from_steps);

    if (to_steps > from_steps) {
        dir = 1;
        DIR_SetHigh();
    } else {
        dir = 0;
        DIR_SetLow();
    }

    target_freq = ((unsigned long)max_speed_mm_min * STEPS_PER_MM) / 60UL;
    if (target_freq > 90000) target_freq = 90000;

    start_freq = 900;
    accel_divisor = 2;

    current_freq = start_freq;

    ramp_accel_steps = (long)((target_freq - start_freq) * accel_divisor);
    ramp_decel_steps = ramp_accel_steps;

    if (ramp_total_steps <= (ramp_accel_steps + ramp_decel_steps)) {
        ramp_accel_steps = ramp_total_steps / 2;
        ramp_decel_steps = ramp_total_steps - ramp_accel_steps;
    }

    ramp_state = RAMP_ACCEL;
    nco_set_freq(current_freq);
    motor_start();
}

static void execute_gcode(const char *cmd) {
    char tx_buffer[64];

    if (cmd[0] == '\0') return;

    if (cmd[0] == 'G' && (cmd[1] == '0' || cmd[1] == '1')) {
        const char *x_ptr = 0;
        const char *p = cmd + 2;
        while (*p) {
            if (*p == 'X' || *p == 'x') { x_ptr = p + 1; break; }
            p++;
        }

        if (x_ptr) {
            long pos = position_get_atomic();
            long steps;

            if (*x_ptr == '+') {
                float mm_val = (float)atof(x_ptr + 1);
                steps = pos + (long)(mm_val * STEPS_PER_MM);
            } else if (*x_ptr == '-') {
                float mm_val = (float)atof(x_ptr + 1);
                steps = pos - (long)(mm_val * STEPS_PER_MM);
            } else {
                float mm_val = (float)atof(x_ptr);
                steps = (long)(mm_val * STEPS_PER_MM);
            }

            if (steps < 0) steps = 0;
            if (steps > 200L * STEPS_PER_MM) steps = 200L * STEPS_PER_MM;

            target_position = steps;

            if (state == SWEEP) state = IDLE;

            setup_ramp(pos, steps);
            state = MOVE;

            UART_SendString("ok\r\n");
        } else {
            UART_SendString("error: falta X\r\n");
        }
    } else if (cmd[0] == 'G' && cmd[1] == '2' && cmd[2] == '8') {
        UART_SendString("Homing...\r\n");
        state = HOMING;
        dir = 0;
        DIR_SetLow();
        nco_set_freq(400);
        motor_start();
    } else if (cmd[0] == 'G' && cmd[1] == '9' && cmd[2] == '2') {
        const char *x_ptr = 0;
        const char *p = cmd + 3;
        while (*p) {
            if (*p == 'X' || *p == 'x') { x_ptr = p + 1; break; }
            p++;
        }

        if (x_ptr) {
            float mm_val = (float)atof(x_ptr);
            long new_steps = (long)(mm_val * STEPS_PER_MM);
            current_position = new_steps;
            if (state == HOMING || state == MOVE) {
                motor_stop();
                state = IDLE;
            }
            sprintf(tx_buffer, "ok X:%.2f\r\n", mm_val);
            UART_SendString(tx_buffer);
        } else {
            current_position = 0;
            if (state == HOMING || state == MOVE) {
                motor_stop();
                state = IDLE;
            }
            UART_SendString("ok X:0.00\r\n");
        }
    } else if (cmd[0] == 'S' && cmd[1] == 'T' && cmd[2] == 'A' && cmd[3] == 'R' && cmd[4] == 'T') {
        long pos = position_get_atomic();
        long pos_mm = pos / STEPS_PER_MM;
        sweep_dir = (pos_mm < 100) ? 1 : 0;
        long next_target = sweep_dir ? 200L * STEPS_PER_MM : 0;
        state = SWEEP;
        target_position = next_target;
        setup_ramp(pos, next_target);
        UART_SendString("ok SWEEP\r\n");
    } else if (cmd[0] == 'S' && cmd[1] == 'T' && cmd[2] == 'O' && cmd[3] == 'P') {
        motor_stop();
        state = STOP;
        target_position = current_position;
        ramp_state = RAMP_IDLE;
        UART_SendString("ok STOP\r\n");
    } else if (cmd[0] == 'H' && cmd[1] == 'O' && cmd[2] == 'M' && cmd[3] == 'E') {
        if (homing_first) {
            homing_first = 0;
            state = HOMING;
            dir = 0;
            DIR_SetLow();
            nco_set_freq(400);
            motor_start();
            UART_SendString("Homing...\r\n");
        } else {
            homing_first = 1;
            motor_stop();
            current_position = 0;
            target_position = 0;
            ramp_state = RAMP_IDLE;
            state = IDLE;
            NCO1INCL = 0;
            NCO1INCH = 0;
            NCO1INCU = 0;
            UART_SendString("ok HOME 0\r\n");
        }
    } else if (cmd[0] == 'M' && cmd[1] == '1' && cmd[2] == '1' && cmd[3] == '4') {
        UART_SendString("ok ");
        UART_SendPosition();
    } else if (cmd[0] == 'M' && cmd[1] == '2' && cmd[2] == '0' && cmd[3] == '3') {
        const char *s_ptr = 0;
        const char *p = cmd + 4;
        while (*p) {
            if (*p == 'S' || *p == 's') { s_ptr = p + 1; break; }
            p++;
        }
        if (s_ptr) {
            long speed = atol(s_ptr);
            if (speed > 0 && speed <= 90000) {
                max_speed_mm_min = speed;
                sprintf(tx_buffer, "ok F%ld\r\n", speed);
                UART_SendString(tx_buffer);
            } else {
                UART_SendString("error: velocidad fuera de rango (1-90000)\r\n");
            }
        } else {
            sprintf(tx_buffer, "ok F%ld\r\n", max_speed_mm_min);
            UART_SendString(tx_buffer);
        }
    } else {
        UART_SendString("error: comando desconocido\r\n");
    }
}

void main(void) {
    SYSTEM_Initialize();

    NCO1CONbits.EN = 0;

    TMR2_SetInterruptHandler(TMR2_ReportPositionISR);
    INTERRUPT_GlobalInterruptEnable();
    INTERRUPT_PeripheralInterruptEnable();

    DIR_SetLow();
    MS1_SetLow();
    MS2_SetLow();
    MS3_SetLow();
    nco_set_freq(start_freq);

    UART_SendString("Sistema listo (Detector Dron Traslacional Full Step)\r\n");

    while (1) {
        if (report_position_flag) {
            report_position_flag = 0;
            UART_SendPosition();
        }

        if (EUSART1_is_rx_ready()) {
            char c = EUSART1_Read();

            if (c == '\r' || c == '\n') {
                if (rx_index > 0) {
                    rx_buffer[rx_index] = '\0';
                    rx_index = 0;

                    for (uint8_t i = 0; i < strlen(rx_buffer); i++) {
                        if (rx_buffer[i] >= 'a' && rx_buffer[i] <= 'z')
                            rx_buffer[i] = rx_buffer[i] - 'a' + 'A';
                    }

                    execute_gcode(rx_buffer);
                }
            } else if (rx_index < 31) {
                rx_buffer[rx_index++] = c;
            }
        }

        if (state == MOVE || state == SWEEP) {
            long current_local_pos = position_get_atomic();
            long steps_moved = labs(current_local_pos - ramp_start_pos);
            long steps_remaining = labs(target_position - current_local_pos);
            
            uint8_t passed_target = 0;
            if (dir == 1 && current_local_pos > target_position) passed_target = 1;
            if (dir == 0 && current_local_pos < target_position) passed_target = 1;

            if (steps_remaining < 2 || passed_target) {
                motor_stop();
                ramp_state = RAMP_IDLE;

                if (state == SWEEP) {
                    long pos_mm = current_local_pos / STEPS_PER_MM;
                    if (pos_mm >= 199) sweep_dir = 0;
                    else if (pos_mm <= 1) sweep_dir = 1;

                    long next_target = sweep_dir ? 200L * STEPS_PER_MM : 0;
                    target_position = next_target;
                    setup_ramp(current_local_pos, next_target);
                } else {
                    state = IDLE;
                    UART_SendString("ok\r\n");
                }
            } else {
                if (ramp_state == RAMP_ACCEL) {
                    if (steps_moved >= ramp_accel_steps) {
                        current_freq = target_freq;
                        nco_set_freq(current_freq);
                        ramp_state = (ramp_total_steps <= (ramp_accel_steps + ramp_decel_steps))
                                     ? RAMP_DECEL : RAMP_CRUISE;
                    } else {
                        current_freq = start_freq + ((unsigned long)steps_moved / accel_divisor);
                        if (current_freq > target_freq) current_freq = target_freq;
                        nco_set_freq(current_freq);
                    }
                } else if (ramp_state == RAMP_CRUISE) {
                    if (steps_remaining <= ramp_decel_steps) ramp_state = RAMP_DECEL;
                }

                if (ramp_state == RAMP_DECEL) {
                    if (steps_remaining > 0) {
                        unsigned long tmp_f = start_freq + ((unsigned long)steps_remaining / accel_divisor);
                        if (tmp_f > target_freq) tmp_f = target_freq;
                        current_freq = tmp_f;
                        nco_set_freq(current_freq);
                    }
                }
            }
        } else if (state == HOMING) {
        }
    }
}
