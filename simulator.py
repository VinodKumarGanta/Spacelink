import simpy
import random
import time
from space_env import SpaceEnvironment
from quantum_relay import QuantumRelay
from database_manager import MissionDatabase
import matplotlib.pyplot as plt

class SpaceLinkSimulator:
    def __init__(self, simulation_time, distance_km):
        self.env = simpy.Environment()
        self.space = SpaceEnvironment(distance_km)
        self.quantum = QuantumRelay()
        self.db = MissionDatabase()
        self.sim_time = simulation_time
        
        # Metrics - Uplink (Earth to Mars)
        self.uplink_sent = 0
        self.uplink_received = 0
        
        # Metrics - Downlink (Mars to Earth)
        self.downlink_sent = 0
        self.downlink_received = 0
        
        self.qber_log = []
        
    def uplink_transmitter(self):
        """Earth to Mars Transmission"""
        while True:
            self.uplink_sent += 1
            # Data to send (2 bits for quantum)
            bits = f"{random.choice(['0','1'])}{random.choice(['0','1'])}"
            
            delay = self.space.get_one_way_light_time()
            survival_prob = self.space.quantum_attenuation()
            
            photon_arrives = random.random() < survival_prob
            
            # Process travel
            self.env.process(self.handle_packet(delay, photon_arrives, bits, "Earth", "Moon"))
            
            # Transmission frequency
            yield self.env.timeout(2) # Send every 2 units

    def downlink_transmitter(self):
        """Moon to Earth Transmission (Two-way support)"""
        # Delay downlink start to simulate response logic or offset
        yield self.env.timeout(1)
        while True:
            self.downlink_sent += 1
            bits = f"{random.choice(['0','1'])}{random.choice(['0','1'])}"
            
            delay = self.space.get_one_way_light_time()
            survival_prob = self.space.quantum_attenuation()
            
            photon_arrives = random.random() < survival_prob
            
            self.env.process(self.handle_packet(delay, photon_arrives, bits, "Moon", "Earth"))
            
            yield self.env.timeout(2)

    def handle_packet(self, delay, success, bits, source, dest):
        """Simulate travel and storage"""
        yield self.env.timeout(delay)
        
        status = "LOST"
        qber = 0.0
        received_bits = "--"
        
        if success:
            decoded = self.quantum.simulate_superdense_coding(bits[0], bits[1])
            qber = self.quantum.calculate_qber(bits, decoded)
            self.qber_log.append(qber)
            
            if qber < 0.1:
                status = "SUCCESS"
                received_bits = decoded
                if source == "Earth":
                    self.uplink_received += 2
                else:
                    self.downlink_received += 2
            else:
                status = "CORRUPTED"
                received_bits = decoded
        
        # Store in Database
        self.db.log_transmission(
            source=source,
            destination=dest,
            protocol="Quantum-SDC",
            data_bits=f"Sent:{bits}|Recv:{received_bits}",
            status=status,
            latency=delay,
            qber=qber
        )

    def run(self):
        print("====== SPACE-LINK TWO-WAY SIMULATION INITIATED ======")
        print(f"Communication Channel: Earth <---> Moon")
        print(f"Distance: {self.space.distance_km} km")
        print(f"Latency: {self.space.get_one_way_light_time():.2f} seconds (one-way)")
        
        self.env.process(self.uplink_transmitter())
        self.env.process(self.downlink_transmitter())
        
        self.env.run(until=self.sim_time)
        
        self.display_metrics()
        self.generate_plots()
        
    def display_metrics(self):
        print("\n====== TWO-WAY SIMULATION RESULTS ======")
        print(f"Total Sim Time: {self.sim_time} units")
        print(f"Uplink bits (E->Mo): Sent {self.uplink_sent*2}, Recv {self.uplink_received}")
        print(f"Downlink bits (Mo->E): Sent {self.downlink_sent*2}, Recv {self.downlink_received}")
        
        avg_qber = sum(self.qber_log)/len(self.qber_log) if self.qber_log else 0
        print(f"Combined QBER: {avg_qber*100:.2f}%")
        print("Database Updated: Supabase Cloud (Live Ingestion)")

    def generate_plots(self):
        # Comparison plot for two-way
        labels = ['Uplink (E->Mo)', 'Downlink (Mo->E)']
        sent = [self.uplink_sent*2, self.downlink_sent*2]
        recv = [self.uplink_received, self.downlink_received]
        
        x = [0, 1]
        width = 0.35
        
        plt.figure(figsize=(10, 6))
        plt.bar([i - width/2 for i in x], sent, width, label='Bits Sent', color='#4488ff')
        plt.bar([i + width/2 for i in x], recv, width, label='Bits Received', color='#00f0ff')
        
        plt.xticks(x, labels)
        plt.title('Two-Way Throughput Analysis', fontsize=16)
        plt.ylabel('Bits')
        plt.legend()
        plt.style.use('dark_background')
        plt.tight_layout()
        plt.savefig('efficiency_plot.png')

if __name__ == "__main__":
    # Faster sim for testing
    sim = SpaceLinkSimulator(simulation_time=1000, distance_km=384400)
    sim.run()
