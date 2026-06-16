import React from 'react';
import { Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';


const LIGHT = {
  theft: require('../../assets/illustrations/emergencies/theft.png'),
  assault: require('../../assets/illustrations/emergencies/assault.png'),
  vandalism: require('../../assets/illustrations/emergencies/vandalism.png'),
  suspicious_activity: require('../../assets/illustrations/emergencies/suspicious-activity.png'),
  traffic_incident: require('../../assets/illustrations/emergencies/traffic-incident.png'),
  noise_complaint: require('../../assets/illustrations/emergencies/noise-complaint.png'),
  fire: require('../../assets/illustrations/emergencies/fire.png'),
  medical_emergency: require('../../assets/illustrations/emergencies/medical-emergency.png'),
  hazard: require('../../assets/illustrations/emergencies/hazard.png'),
  other: require('../../assets/illustrations/emergencies/other.png'),
};

const DARK = {
  theft: require('../../assets/illustrations/emergencies-dark/theft.png'),
  assault: require('../../assets/illustrations/emergencies-dark/assault.png'),
  vandalism: require('../../assets/illustrations/emergencies-dark/vandalism.png'),
  suspicious_activity: require('../../assets/illustrations/emergencies-dark/suspicious-activity.png'),
  traffic_incident: require('../../assets/illustrations/emergencies-dark/traffic-incident.png'),
  noise_complaint: require('../../assets/illustrations/emergencies-dark/noise-complaint.png'),
  fire: require('../../assets/illustrations/emergencies-dark/fire.png'),
  medical_emergency: require('../../assets/illustrations/emergencies-dark/medical-emergency.png'),
  hazard: require('../../assets/illustrations/emergencies-dark/hazard.png'),
  other: require('../../assets/illustrations/emergencies-dark/other.png'),
};

export default function IncidentIllustration({ category, size = 160, style, resizeMode = 'contain' }) {
  const { isDark } = useTheme();
  const set = isDark ? DARK : LIGHT;
  const source = set[category] || set.other;
  return <Image source={source} style={[{ width: size, height: size }, style]} resizeMode={resizeMode} />;
}
