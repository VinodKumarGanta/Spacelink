/*
 * Space-Link | Physical Model (Arduino)
 * Simulates Photon Transmission via Laser/LED and detection via LDR (Light Dependent Resistor).
 *
 * Transmitter (Earth): Pulses a laser/LED.
 * Receiver (Mars): Reads the LDR to process pulses.
 */

#define LASER_PIN 13 // Digital Pin for Laser/LED Transmitter (Alice)
#define LDR_PIN A0   // Analog Pin for LDR Receiver (Bob)

// Threshold for detecting light (Adjust based on ambient light in the room)
#define LIGHT_THRESHOLD 500

// Superdense Coding State Mappings
// We map the 4 states (00, 01, 10, 11) to different numbers of pulses
// Or different pulse durations. For simplicity, we use pulse count.
// 00 = 1 pulse, 01 = 2 pulses, 10 = 3 pulses, 11 = 4 pulses

int getPulseCount(String bits) {
  if (bits == "00") return 1;
  if (bits == "01") return 2;
  if (bits == "10") return 3;
  if (bits == "11") return 4;
  return 0;
}

void setup() {
  pinMode(LASER_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Space-Link Quantum Relay Initialized (Hardware Mode)");
}

void transmitPhoton(String bits) {
  int pulses = getPulseCount(bits);
  Serial.print("Alice Encoding: ");
  Serial.print(bits);
  Serial.print(" -> Transmitting ");
  Serial.print(pulses);
  Serial.println(" pulses.");

  for (int i = 0; i < pulses; i++) {
    digitalWrite(LASER_PIN, HIGH);
    delay(200); // 200ms pulse
    digitalWrite(LASER_PIN, LOW);
    delay(200); // 200ms pause
  }
}

void receivePhoton() {
  int detectCount = 0;
  unsigned long startWait = millis();
  
  // Wait for 2 seconds to count pulses
  while (millis() - startWait < 2000) {
    int ldrValue = analogRead(LDR_PIN);
    
    // If light detected, wait until it turns off, then increment count
    if (ldrValue > LIGHT_THRESHOLD) {
      detectCount++;
      while(analogRead(LDR_PIN) > LIGHT_THRESHOLD) {
        delay(10); // Debounce
      }
    }
  }

  if (detectCount > 0) {
    String decodedBits = "";
    if (detectCount == 1) decodedBits = "00";
    else if (detectCount == 2) decodedBits = "01";
    else if (detectCount == 3) decodedBits = "10";
    else if (detectCount >= 4) decodedBits = "11";
    
    Serial.print("Bob Detected: ");
    Serial.print(detectCount);
    Serial.print(" pulses -> Decoded: ");
    Serial.println(decodedBits);
  }
}

void loop() {
  // Simulate continuous sending for demo purposes
  // In a real scenario, this would be an interrupt or serial input driven
  
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() == 2 && (input[0] == '0' || input[0] == '1') && (input[1] == '0' || input[1] == '1')) {
        transmitPhoton(input);
        
        // Simulating immediate transit delay
        delay(100); 
        
        receivePhoton();
        Serial.println("--------------------------------");
    } else {
        Serial.println("Error: Enter a 2-bit string e.g., '10', '01'");
    }
  }
}
