import { NextRequest } from 'next/server'

export function createUploadRequest(file: File, filePath: string): NextRequest {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('filePath', filePath)

  return new NextRequest('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData,
  })
}
