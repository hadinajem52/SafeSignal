import {
  Shield,
  ShieldCheck,
  Radio,
  Clock,
  Users,
  Search,
  Bell,
  FileText,
  MapPin,
  CheckCircle2,
  UserCheck,
  Database,
} from 'lucide-react'

const ROLE_CONFIG = {
  moderator: {
    title: 'Moderation Control Center',
    subtitle: 'Review and classify incoming incident reports',
    icon: Shield,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    actions: [
      { icon: Clock,    label: 'Review Queue',     sub: 'Pending reports',      to: '/reports'  },
      { icon: Users,    label: 'Manage Users',     sub: 'User accounts',        to: '/users'    },
      { icon: Search,   label: 'Search Incidents', sub: 'Advanced search',      to: '/reports'  },
      { icon: Bell,     label: 'Set Alert',        sub: 'Configure thresholds', to: '/settings' },
      { icon: FileText, label: 'All Reports',      sub: 'Browse reports',       to: '/reports'  },
    ],
  },

  law_enforcement: {
    title: 'Incident Response Center',
    subtitle: 'Active deployments and field case management',
    icon: Radio,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    actions: [
      { icon: Radio,        label: 'Active Cases', sub: 'Open deployments',   to: '/lei'      },
      { icon: MapPin,       label: 'Map View',     sub: 'Incident locations',  to: '/lei'      },
      { icon: Search,       label: 'Search Cases', sub: 'Find an incident',   to: '/lei'      },
      { icon: CheckCircle2, label: 'Closed Cases', sub: 'Review closed',      to: '/lei'      },
      { icon: Bell,         label: 'Settings',     sub: 'Preferences',        to: '/settings' },
    ],
  },

  admin: {
    title: 'Platform Control Center',
    subtitle: 'Full administrative oversight of SafeSignal',
    icon: ShieldCheck,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    actions: [
      { icon: Clock,       label: 'Review Queue', sub: 'Pending reports',      to: '/reports' },
      { icon: UserCheck,   label: 'Applications', sub: 'Staff access requests', to: '/admin'   },
      { icon: Users,       label: 'Manage Users', sub: 'User accounts',         to: '/users'   },
      { icon: ShieldCheck, label: 'Admin Panel',  sub: 'System management',     to: '/admin'   },
      { icon: Database,    label: 'Database',     sub: 'Inspect tables',        to: '/admin'   },
    ],
  },
}

export default ROLE_CONFIG
