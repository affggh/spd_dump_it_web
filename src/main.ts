import { Button, Dialog, IconButton, Snackbar } from 'sober'
import './style.css'
import { patchTosFile } from './tos_noavb'

export * from 'sober/button'
export * from 'sober/page'
export * from 'sober/card'
export * from 'sober/appbar'
export * from 'sober/icon'
export * from 'sober/icon-button'

const githubButton = document.querySelector<IconButton>('#githubButton')
const infoButton = document.querySelector<IconButton>('#infoButton')
const aboutDialog = document.querySelector<Dialog>('#aboutDialog')
const uploadButton = document.querySelector<Button>('#uploadButton')
const fileInput = document.querySelector<HTMLInputElement>('#fileInput')

if (githubButton) {
  githubButton.addEventListener('click', () => {
    window.open('https://github.com/CircleCashTeam', '_blank')
  })
}

if (infoButton) {
  if (aboutDialog) {
    infoButton.addEventListener('click', () => {
      aboutDialog.showed = true
    })
  }
}

if (uploadButton && fileInput) {
  uploadButton.addEventListener('click', () => { fileInput.click() })
  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement | null
    if (target) {
      const files = target.files
      if (files) {
        const file = files[0]
        const snackbar = Snackbar.builder({
          text: `Upload file: ${file.name}`,
          type: 'info'
        })

        setTimeout(() => {
          snackbar.remove()
        }, 10000);

        uploadButton.disabled = true
        
        patchTosFile(file).then((value) => {
          const code = value.code
          const message = value.message
          const blob = value.blob

          if (code == 0) {
            const snackbar = Snackbar.builder({
              text: message,
              type: 'info'
            })
            setTimeout(() => {
                snackbar.remove()
            }, 10000);
          } else if (code == 1) {
            const snackbar = Snackbar.builder({
              text: message,
              type: 'error'
            })
            setTimeout(() => {
                snackbar.remove()
            }, 10000);
            uploadButton.disabled = false
          }

          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'tos-noavb.bin'
            a.style.display = 'none'

            document.body.appendChild(a)
            a.click()

            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            uploadButton.disabled = false
          }
        })
      }
    }
  })
}