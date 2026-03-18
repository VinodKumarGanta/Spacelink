from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit_aer import AerSimulator
import numpy as np

class QuantumRelay:
    """
    Simulates Quantum Superdense Coding.
    Alice (Earth) and Bob (Mars) share an entangled qubit pair (Bell state).
    """
    
    def __init__(self, qber_threshold=0.11):
        self.simulator = AerSimulator()
        self.qber_threshold = qber_threshold
    
    def simulate_superdense_coding(self, bit1, bit2):
        """Simulates transmission of 2 classical bits using 1 qubit."""
        q = QuantumRegister(2, 'q')
        c = ClassicalRegister(2, 'c')
        qc = QuantumCircuit(q, c)
        
        # Bell State creation
        qc.h(q[0])
        qc.cx(q[0], q[1])
        qc.barrier()
        
        # Alice encodes
        if bit1 == '1': qc.z(q[0])
        if bit2 == '1': qc.x(q[0])
        qc.barrier()
        
        # Bob decodes
        qc.cx(q[0], q[1])
        qc.h(q[0])
        qc.barrier()
        
        qc.measure(q[0], c[0])
        qc.measure(q[1], c[1])
        
        job = self.simulator.run(qc, shots=1)
        result = job.result()
        counts = result.get_counts(qc)
        
        decoded = list(counts.keys())[0]
        # bit2 is c[1], bit1 is c[0]
        return f"{decoded[1]}{decoded[0]}"
        
    def calculate_qber(self, original_bits, received_bits, environmental_noise=0.01):
        """Quantum Bit Error Rate logic."""
        errors = 0
        for b1, b2 in zip(original_bits, received_bits):
            if b1 != b2:
                errors += 1
                
        # Noise injection (Eavesdropping Simulation)
        if np.random.rand() < environmental_noise:
            errors += 1
            
        return errors / len(original_bits)

    def is_link_compromised(self, qber):
        """
        Security Logic: Detector for Eavesdropping.
        If QBER exceeds threshold, it implies an intercepting party (Eve)
        has compromised the quantum state.
        """
        return qber > self.qber_threshold
