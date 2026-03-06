import math
import random

class SpaceEnvironment:
    """
    Simulates the physics environment between Earth and Mars.
    """
    SPEED_OF_LIGHT = 299792.458  # km/s

    def __init__(self, distance_km=225000000):
        """
        :param distance_km: Distance between Earth and Mars in km.
                           Varies from ~55M to ~400M km.
        """
        self.distance_km = distance_km

    def get_one_way_light_time(self):
        """
        Returns the delay in seconds for light to travel the distance.
        """
        return self.distance_km / self.SPEED_OF_LIGHT

    def calculate_signal_loss(self, frequency_hz=32e9, tx_power_dbm=50, rx_gain_dbi=35, tx_gain_dbi=45):
        """
        Calculates signal loss based on the Free Space Path Loss (FSPL) and inverse square law.
        Default params simulate a Deep Space Network Ka-band link.
        """
        # FSPL in dB = 20*log10(d) + 20*log10(f) + 20*log10(4*pi/c)
        # where d is in km, f is in MHz
        freq_mhz = frequency_hz / 1e6
        fspl = 20 * math.log10(self.distance_km) + 20 * math.log10(freq_mhz) + 32.44
        
        # Link Margin (simplified)
        rx_power = tx_power_dbm + tx_gain_dbi + rx_gain_dbi - fspl
        return fspl, rx_power

    def quantum_attenuation(self, photon_wavelength_nm=1550):
        """
        Estimates the probability of a single photon surviving the journey.
        """
        # Simplified probability model based on distance
        baseline_km = 225000000
        distance_ratio = self.distance_km / baseline_km
        
        # Baseline attenuation exponent at 225M km is ~0.1975
        attn_exponent = 0.1975 * (distance_ratio ** 2)
        
        survival_prob = math.exp(-attn_exponent)
        return survival_prob

    def inject_interference(self):
        """Simulates solar wind or cosmic noise interference."""
        return random.uniform(0.01, 0.05) if random.random() < 0.1 else 0.005
