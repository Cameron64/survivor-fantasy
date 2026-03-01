'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Upload, X } from 'lucide-react'

interface Area {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropperProps {
  value?: string
  onChange: (url: string) => void
}

export function ImageCropper({ value, onChange }: ImageCropperProps) {
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [urlInput, setUrlInput] = useState('')

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleUrlLoad = () => {
    if (urlInput) {
      setImageSrc(urlInput)
      setShowCropDialog(true)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
        setShowCropDialog(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const createCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    try {
      const image = await createImage(imageSrc)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      // Set canvas size to cropped area
      canvas.width = croppedAreaPixels.width
      canvas.height = croppedAreaPixels.height

      // Draw cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      )

      // Convert to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedUrl = URL.createObjectURL(blob)
          onChange(croppedUrl)
          setShowCropDialog(false)
          setImageSrc(null)
          setCrop({ x: 0, y: 0 })
          setZoom(1)
        }
      }, 'image/jpeg', 0.95)
    } catch (error) {
      console.error('Error creating cropped image:', error)
    }
  }

  const clearImage = () => {
    onChange('')
  }

  return (
    <div className="space-y-3">
      <Label>Contestant Image</Label>

      {value && (
        <div className="flex items-center gap-3">
          <div className="relative inline-block">
            <img
              src={value}
              alt="Contestant preview"
              className="h-24 w-24 rounded-full object-cover border-2 border-border"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setImageSrc(value)
              setShowCropDialog(true)
            }}
          >
            Re-crop Image
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Paste image URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleUrlLoad()
              }
            }}
          />
        </div>
        <Button type="button" onClick={handleUrlLoad} variant="outline">
          Load URL
        </Button>
      </div>

      <div className="flex gap-2">
        <label htmlFor="file-upload" className="flex-1">
          <Button type="button" variant="outline" className="w-full" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </span>
          </Button>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crop & Zoom Image</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative h-[400px] bg-muted rounded-lg">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Zoom</Label>
              <Slider
                value={[zoom]}
                onValueChange={(values) => setZoom(values[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCropDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createCroppedImage}>
              Apply Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function to create an image element from a URL
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}
