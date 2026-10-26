/**
  @Generated Pin Manager Header File

  @Company:
    Microchip Technology Inc.

  @File Name:
    pin_manager.h

  @Summary:
    This is the Pin Manager file generated using PIC10 / PIC12 / PIC16 / PIC18 MCUs

  @Description
    This header file provides APIs for driver for .
    Generation Information :
        Product Revision  :  PIC10 / PIC12 / PIC16 / PIC18 MCUs - 1.81.8
        Device            :  PIC16F18426
        Driver Version    :  2.11
    The generated drivers are tested against the following:
        Compiler          :  XC8 2.36 and above
        MPLAB 	          :  MPLAB X 6.00	
*/

/*
    (c) 2018 Microchip Technology Inc. and its subsidiaries. 
    
    Subject to your compliance with these terms, you may use Microchip software and any 
    derivatives exclusively with Microchip products. It is your responsibility to comply with third party 
    license terms applicable to your use of third party software (including open source software) that 
    may accompany Microchip software.
    
    THIS SOFTWARE IS SUPPLIED BY MICROCHIP "AS IS". NO WARRANTIES, WHETHER 
    EXPRESS, IMPLIED OR STATUTORY, APPLY TO THIS SOFTWARE, INCLUDING ANY 
    IMPLIED WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS 
    FOR A PARTICULAR PURPOSE.
    
    IN NO EVENT WILL MICROCHIP BE LIABLE FOR ANY INDIRECT, SPECIAL, PUNITIVE, 
    INCIDENTAL OR CONSEQUENTIAL LOSS, DAMAGE, COST OR EXPENSE OF ANY KIND 
    WHATSOEVER RELATED TO THE SOFTWARE, HOWEVER CAUSED, EVEN IF MICROCHIP 
    HAS BEEN ADVISED OF THE POSSIBILITY OR THE DAMAGES ARE FORESEEABLE. TO 
    THE FULLEST EXTENT ALLOWED BY LAW, MICROCHIP'S TOTAL LIABILITY ON ALL 
    CLAIMS IN ANY WAY RELATED TO THIS SOFTWARE WILL NOT EXCEED THE AMOUNT 
    OF FEES, IF ANY, THAT YOU HAVE PAID DIRECTLY TO MICROCHIP FOR THIS 
    SOFTWARE.
*/

#ifndef PIN_MANAGER_H
#define PIN_MANAGER_H

/**
  Section: Included Files
*/

#include <xc.h>

#define INPUT   1
#define OUTPUT  0

#define HIGH    1
#define LOW     0

#define ANALOG      1
#define DIGITAL     0

#define PULL_UP_ENABLED      1
#define PULL_UP_DISABLED     0

// get/set AUX2 aliases
#define AUX2_TRIS                 TRISAbits.TRISA4
#define AUX2_LAT                  LATAbits.LATA4
#define AUX2_PORT                 PORTAbits.RA4
#define AUX2_WPU                  WPUAbits.WPUA4
#define AUX2_OD                   ODCONAbits.ODCA4
#define AUX2_ANS                  ANSELAbits.ANSA4
#define AUX2_SetHigh()            do { LATAbits.LATA4 = 1; } while(0)
#define AUX2_SetLow()             do { LATAbits.LATA4 = 0; } while(0)
#define AUX2_Toggle()             do { LATAbits.LATA4 = ~LATAbits.LATA4; } while(0)
#define AUX2_GetValue()           PORTAbits.RA4
#define AUX2_SetDigitalInput()    do { TRISAbits.TRISA4 = 1; } while(0)
#define AUX2_SetDigitalOutput()   do { TRISAbits.TRISA4 = 0; } while(0)
#define AUX2_SetPullup()          do { WPUAbits.WPUA4 = 1; } while(0)
#define AUX2_ResetPullup()        do { WPUAbits.WPUA4 = 0; } while(0)
#define AUX2_SetPushPull()        do { ODCONAbits.ODCA4 = 0; } while(0)
#define AUX2_SetOpenDrain()       do { ODCONAbits.ODCA4 = 1; } while(0)
#define AUX2_SetAnalogMode()      do { ANSELAbits.ANSA4 = 1; } while(0)
#define AUX2_SetDigitalMode()     do { ANSELAbits.ANSA4 = 0; } while(0)

// get/set AUX1 aliases
#define AUX1_TRIS                 TRISAbits.TRISA5
#define AUX1_LAT                  LATAbits.LATA5
#define AUX1_PORT                 PORTAbits.RA5
#define AUX1_WPU                  WPUAbits.WPUA5
#define AUX1_OD                   ODCONAbits.ODCA5
#define AUX1_ANS                  ANSELAbits.ANSA5
#define AUX1_SetHigh()            do { LATAbits.LATA5 = 1; } while(0)
#define AUX1_SetLow()             do { LATAbits.LATA5 = 0; } while(0)
#define AUX1_Toggle()             do { LATAbits.LATA5 = ~LATAbits.LATA5; } while(0)
#define AUX1_GetValue()           PORTAbits.RA5
#define AUX1_SetDigitalInput()    do { TRISAbits.TRISA5 = 1; } while(0)
#define AUX1_SetDigitalOutput()   do { TRISAbits.TRISA5 = 0; } while(0)
#define AUX1_SetPullup()          do { WPUAbits.WPUA5 = 1; } while(0)
#define AUX1_ResetPullup()        do { WPUAbits.WPUA5 = 0; } while(0)
#define AUX1_SetPushPull()        do { ODCONAbits.ODCA5 = 0; } while(0)
#define AUX1_SetOpenDrain()       do { ODCONAbits.ODCA5 = 1; } while(0)
#define AUX1_SetAnalogMode()      do { ANSELAbits.ANSA5 = 1; } while(0)
#define AUX1_SetDigitalMode()     do { ANSELAbits.ANSA5 = 0; } while(0)

// get/set RC0 procedures
#define RC0_SetHigh()            do { LATCbits.LATC0 = 1; } while(0)
#define RC0_SetLow()             do { LATCbits.LATC0 = 0; } while(0)
#define RC0_Toggle()             do { LATCbits.LATC0 = ~LATCbits.LATC0; } while(0)
#define RC0_GetValue()              PORTCbits.RC0
#define RC0_SetDigitalInput()    do { TRISCbits.TRISC0 = 1; } while(0)
#define RC0_SetDigitalOutput()   do { TRISCbits.TRISC0 = 0; } while(0)
#define RC0_SetPullup()             do { WPUCbits.WPUC0 = 1; } while(0)
#define RC0_ResetPullup()           do { WPUCbits.WPUC0 = 0; } while(0)
#define RC0_SetAnalogMode()         do { ANSELCbits.ANSC0 = 1; } while(0)
#define RC0_SetDigitalMode()        do { ANSELCbits.ANSC0 = 0; } while(0)

// get/set DIR aliases
#define DIR_TRIS                 TRISCbits.TRISC1
#define DIR_LAT                  LATCbits.LATC1
#define DIR_PORT                 PORTCbits.RC1
#define DIR_WPU                  WPUCbits.WPUC1
#define DIR_OD                   ODCONCbits.ODCC1
#define DIR_ANS                  ANSELCbits.ANSC1
#define DIR_SetHigh()            do { LATCbits.LATC1 = 1; } while(0)
#define DIR_SetLow()             do { LATCbits.LATC1 = 0; } while(0)
#define DIR_Toggle()             do { LATCbits.LATC1 = ~LATCbits.LATC1; } while(0)
#define DIR_GetValue()           PORTCbits.RC1
#define DIR_SetDigitalInput()    do { TRISCbits.TRISC1 = 1; } while(0)
#define DIR_SetDigitalOutput()   do { TRISCbits.TRISC1 = 0; } while(0)
#define DIR_SetPullup()          do { WPUCbits.WPUC1 = 1; } while(0)
#define DIR_ResetPullup()        do { WPUCbits.WPUC1 = 0; } while(0)
#define DIR_SetPushPull()        do { ODCONCbits.ODCC1 = 0; } while(0)
#define DIR_SetOpenDrain()       do { ODCONCbits.ODCC1 = 1; } while(0)
#define DIR_SetAnalogMode()      do { ANSELCbits.ANSC1 = 1; } while(0)
#define DIR_SetDigitalMode()     do { ANSELCbits.ANSC1 = 0; } while(0)

// get/set FEEDBACK aliases
#define FEEDBACK_TRIS                 TRISCbits.TRISC2
#define FEEDBACK_LAT                  LATCbits.LATC2
#define FEEDBACK_PORT                 PORTCbits.RC2
#define FEEDBACK_WPU                  WPUCbits.WPUC2
#define FEEDBACK_OD                   ODCONCbits.ODCC2
#define FEEDBACK_ANS                  ANSELCbits.ANSC2
#define FEEDBACK_SetHigh()            do { LATCbits.LATC2 = 1; } while(0)
#define FEEDBACK_SetLow()             do { LATCbits.LATC2 = 0; } while(0)
#define FEEDBACK_Toggle()             do { LATCbits.LATC2 = ~LATCbits.LATC2; } while(0)
#define FEEDBACK_GetValue()           PORTCbits.RC2
#define FEEDBACK_SetDigitalInput()    do { TRISCbits.TRISC2 = 1; } while(0)
#define FEEDBACK_SetDigitalOutput()   do { TRISCbits.TRISC2 = 0; } while(0)
#define FEEDBACK_SetPullup()          do { WPUCbits.WPUC2 = 1; } while(0)
#define FEEDBACK_ResetPullup()        do { WPUCbits.WPUC2 = 0; } while(0)
#define FEEDBACK_SetPushPull()        do { ODCONCbits.ODCC2 = 0; } while(0)
#define FEEDBACK_SetOpenDrain()       do { ODCONCbits.ODCC2 = 1; } while(0)
#define FEEDBACK_SetAnalogMode()      do { ANSELCbits.ANSC2 = 1; } while(0)
#define FEEDBACK_SetDigitalMode()     do { ANSELCbits.ANSC2 = 0; } while(0)

// get/set SETPOINT aliases
#define SETPOINT_TRIS                 TRISCbits.TRISC3
#define SETPOINT_LAT                  LATCbits.LATC3
#define SETPOINT_PORT                 PORTCbits.RC3
#define SETPOINT_WPU                  WPUCbits.WPUC3
#define SETPOINT_OD                   ODCONCbits.ODCC3
#define SETPOINT_ANS                  ANSELCbits.ANSC3
#define SETPOINT_SetHigh()            do { LATCbits.LATC3 = 1; } while(0)
#define SETPOINT_SetLow()             do { LATCbits.LATC3 = 0; } while(0)
#define SETPOINT_Toggle()             do { LATCbits.LATC3 = ~LATCbits.LATC3; } while(0)
#define SETPOINT_GetValue()           PORTCbits.RC3
#define SETPOINT_SetDigitalInput()    do { TRISCbits.TRISC3 = 1; } while(0)
#define SETPOINT_SetDigitalOutput()   do { TRISCbits.TRISC3 = 0; } while(0)
#define SETPOINT_SetPullup()          do { WPUCbits.WPUC3 = 1; } while(0)
#define SETPOINT_ResetPullup()        do { WPUCbits.WPUC3 = 0; } while(0)
#define SETPOINT_SetPushPull()        do { ODCONCbits.ODCC3 = 0; } while(0)
#define SETPOINT_SetOpenDrain()       do { ODCONCbits.ODCC3 = 1; } while(0)
#define SETPOINT_SetAnalogMode()      do { ANSELCbits.ANSC3 = 1; } while(0)
#define SETPOINT_SetDigitalMode()     do { ANSELCbits.ANSC3 = 0; } while(0)

// get/set RC4 procedures
#define RC4_SetHigh()            do { LATCbits.LATC4 = 1; } while(0)
#define RC4_SetLow()             do { LATCbits.LATC4 = 0; } while(0)
#define RC4_Toggle()             do { LATCbits.LATC4 = ~LATCbits.LATC4; } while(0)
#define RC4_GetValue()              PORTCbits.RC4
#define RC4_SetDigitalInput()    do { TRISCbits.TRISC4 = 1; } while(0)
#define RC4_SetDigitalOutput()   do { TRISCbits.TRISC4 = 0; } while(0)
#define RC4_SetPullup()             do { WPUCbits.WPUC4 = 1; } while(0)
#define RC4_ResetPullup()           do { WPUCbits.WPUC4 = 0; } while(0)
#define RC4_SetAnalogMode()         do { ANSELCbits.ANSC4 = 1; } while(0)
#define RC4_SetDigitalMode()        do { ANSELCbits.ANSC4 = 0; } while(0)

// get/set RC5 procedures
#define RC5_SetHigh()            do { LATCbits.LATC5 = 1; } while(0)
#define RC5_SetLow()             do { LATCbits.LATC5 = 0; } while(0)
#define RC5_Toggle()             do { LATCbits.LATC5 = ~LATCbits.LATC5; } while(0)
#define RC5_GetValue()              PORTCbits.RC5
#define RC5_SetDigitalInput()    do { TRISCbits.TRISC5 = 1; } while(0)
#define RC5_SetDigitalOutput()   do { TRISCbits.TRISC5 = 0; } while(0)
#define RC5_SetPullup()             do { WPUCbits.WPUC5 = 1; } while(0)
#define RC5_ResetPullup()           do { WPUCbits.WPUC5 = 0; } while(0)
#define RC5_SetAnalogMode()         do { ANSELCbits.ANSC5 = 1; } while(0)
#define RC5_SetDigitalMode()        do { ANSELCbits.ANSC5 = 0; } while(0)

/**
   @Param
    none
   @Returns
    none
   @Description
    GPIO and peripheral I/O initialization
   @Example
    PIN_MANAGER_Initialize();
 */
void PIN_MANAGER_Initialize (void);

/**
 * @Param
    none
 * @Returns
    none
 * @Description
    Interrupt on Change Handling routine
 * @Example
    PIN_MANAGER_IOC();
 */
void PIN_MANAGER_IOC(void);



#endif // PIN_MANAGER_H
/**
 End of File
*/