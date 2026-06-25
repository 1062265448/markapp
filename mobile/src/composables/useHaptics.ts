import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

let hapticsAvailable = false

// Check if haptics are available (native app)
const checkHaptics = async () => {
  try {
    await Haptics.vibrate({ duration: 1 })
    hapticsAvailable = true
  } catch {
    hapticsAvailable = false
  }
}

// Initialize on first use
checkHaptics()

export function useHaptics() {
  const light = async () => {
    if (!hapticsAvailable) return
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {
      /* ignore */
    }
  }

  const medium = async () => {
    if (!hapticsAvailable) return
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch {
      /* ignore */
    }
  }

  const heavy = async () => {
    if (!hapticsAvailable) return
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch {
      /* ignore */
    }
  }

  const success = async () => {
    if (!hapticsAvailable) return
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch {
      /* ignore */
    }
  }

  const warning = async () => {
    if (!hapticsAvailable) return
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch {
      /* ignore */
    }
  }

  const error = async () => {
    if (!hapticsAvailable) return
    try {
      await Haptics.notification({ type: NotificationType.Error })
    } catch {
      /* ignore */
    }
  }

  return { light, medium, heavy, success, warning, error }
}
