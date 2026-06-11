import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

export function useCamera() {
  const takePhoto = async (): Promise<Blob | null> => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      })

      const response = await fetch(photo.webPath!)
      const blob = await response.blob()
      return blob
    } catch (e) {
      console.warn('[Camera] 拍照取消或失败:', e)
      return null
    }
  }

  const pickFromGallery = async (): Promise<Blob | null> => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      })

      const response = await fetch(photo.webPath!)
      const blob = await response.blob()
      return blob
    } catch (e) {
      console.warn('[Camera] 选图取消或失败:', e)
      return null
    }
  }

  return { takePhoto, pickFromGallery }
}
