async function loadFile(file: File): Promise<ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            const result = e.target?.result
            if (result) {
                resolve(result as ArrayBuffer)
            } else {
                resolve(null)
            }
        }

        reader.onerror = (e) => {
            console.error('File reading error:', e)
            reject(new Error('Failed to read file'))
        }

        reader.readAsArrayBuffer(file)
    })
}

export async function patchTosFile(file: File) {
    try {
        const arrayBuffer = await loadFile(file)
        if (arrayBuffer) {
            const dataView = new DataView(arrayBuffer)
            if ((dataView.getUint32(0, true) >>> 0) != 0x42544844) {
                throw new Error('The file is not sprd trusted firmware')
            } else if (dataView.getUint32(0x30, true) == 0x0) {
                throw new Error('broken sprd trusted firmware')
            }
            if (dataView.getUint32(0x30, true) + 0x260 >= arrayBuffer.byteLength) {
                return {
                    code: 0,
                    message: `0x${arrayBuffer.byteLength.toString(16)}`
                }
            }
            const record_offset = dataView.getUint32(0x30, true) >>> 0
            var size: number
            if ((dataView.getUint32(record_offset + 0x200 + 0x50, true) >>> 0) > 0 && (dataView.getUint32(record_offset + 0x200 + 0x58, true) >>> 0) > 0) {
                size = (dataView.getUint32(record_offset + 0x200 + 0x50, true) >>> 0) + (dataView.getUint32(record_offset + 0x200 + 0x58, true) >>> 0)
            } else if ((dataView.getUint32(record_offset + 0x200 + 0x30, true) >>> 0) > 0 && (dataView.getUint32(record_offset + 0x200 + 0x38, true) >>> 0) > 0) {
                size = (dataView.getUint32(record_offset + 0x200 + 0x30, true) >>> 0) + (dataView.getUint32(record_offset + 0x200 + 0x38, true) >>> 0)
            } else if ((dataView.getUint32(record_offset + 0x200 + 0x20, true) >>> 0) > 0 && (dataView.getUint32(record_offset + 0x200 + 0x28, true) >>> 0) > 0) {
                size = (dataView.getUint32(record_offset + 0x200 + 0x20, true) >>> 0) + (dataView.getUint32(record_offset + 0x200 + 0x28, true) >>> 0)
            } else {
                size = record_offset + 0x200
            }
            console.log(`0x${size.toString(16)}`)

            var start_pos: number = 0
            var end_pos: number = 0
            var sp_pos: number = 0
            //var start_pattern = 0xA9007BFD
            //var end_pattern = 0xA8007BFD

            for (let i = 0; i < size; i += 4) {
                var count1 = 0
                var count2 = 0

                if (i + 0x200 + 0x4 > dataView.byteLength) { // avoid over read
                    break
                }
                let current = ((dataView.getUint32(0x200 + i, true) >>> 0) & 0xFF00FFFF) >>> 0

                if (current === 0xA9007BFD) {
                    start_pos = i
                } else if (current === 0x910003BF) {
                    sp_pos = i
                } else if (start_pos > 0 && current === 0xA8007BFD) {
                    end_pos = i
                    if (sp_pos > 0) {
                        for (let m = start_pos; m < end_pos; m += 4) {
                            if (((dataView.getUint32(0x200 + m, true)) >>> 16) === 0x9400) {
                                count1++
                            } else if (((dataView.getUint32(0x200 + m, true)) >>> 16) === 0xb400) {
                                count2++
                            }
                        }
                        if (count1 > 0 && count2 > 0 && count1 + count2 > 2) {
                            for (let m = sp_pos + 4; m < end_pos; m += 4) {
                                if ((dataView.getUint16(0x200 + m, true) >>> 0) === 0x3e0) {
                                    dataView.setUint32(0x200 + m, (0x52800000 >>> 0), true)
                                    console.log(`patch mov at 0x${((0x200 + m) >>> 0).toString(16)}`)
                                }
                            }
                        }
                    }
                    start_pos = 0
                    sp_pos = 0
                }
            }

            return {
                code: 0,
                message: "ArrayBuffer patched done",
                blob: new Blob([dataView.buffer], { type: 'application/octet-stream' })
            }
        }
    } catch (e) {
        return {
            code: 1,
            message: `Error: ${e}`
        }
    }

    return {
        code: 0,
        message: "Success"
    }
}