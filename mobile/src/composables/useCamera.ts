import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

async function photoToBlob(photo: { webPath?: string }): Promise<Blob> {
  if (!photo.webPath) {
    throw new Error('拍照未返回有效图片路径')
  }
  const response = await fetch(photo.webPath)
  if (!response.ok) {
    throw new Error(`读取图片失败: ${response.status}`)
  }
  return response.blob()
}

export function useCamera() {
  const takePhoto = async (): Promise<Blob | null> => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      })
      return await photoToBlob(photo)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('cancelled') || msg.includes('canceled')) {
        return null
      }
      console.warn('[Camera] 拍照失败:', e)
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
      return await photoToBlob(photo)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('cancelled') || msg.includes('canceled')) {
        return null
      }
      console.warn('[Camera] 选图失败:', e)
      return null
    }
  }

  return { takePhoto, pickFromGallery }
}
