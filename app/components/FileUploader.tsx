import {useState, useCallback} from 'react'
import {useDropzone} from 'react-dropzone'
import { formatSize } from '../lib/utils'

interface FileUploaderProps {
    onFileSelect?: (file: File | null) => void;
    onTextInput?: (text: string | null) => void;
}

const FileUploader = ({ onFileSelect, onTextInput }: FileUploaderProps) => {
    const [isTextMode, setIsTextMode] = useState(false);
    const [resumeText, setResumeText] = useState('');
    
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0] || null;
        
        // Clear text mode if file is selected
        if (file) {
            setIsTextMode(false);
            setResumeText('');
            if (onTextInput) onTextInput(null);
        }

        onFileSelect?.(file);
    }, [onFileSelect, onTextInput]);

    const maxFileSize = 20 * 1024 * 1024; // 20MB in bytes

    const {getRootProps, getInputProps, isDragActive, acceptedFiles} = useDropzone({
        onDrop,
        multiple: false,
        accept: { 
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt']
        },
        maxSize: maxFileSize,
    })

    const file = acceptedFiles[0] || null;

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setResumeText(text);
        if (onTextInput) onTextInput(text);
        
        // Clear file if text is entered
        if (text && file) {
            onFileSelect?.(null);
        }
    };

    const handleSwitchMode = () => {
        setIsTextMode(!isTextMode);
        
        // Clear the opposite input method when switching
        if (!isTextMode) {
            // Switching to text mode, clear file
            if (file) onFileSelect?.(null);
        } else {
            // Switching to file mode, clear text
            setResumeText('');
            if (onTextInput) onTextInput(null);
        }
    };

    return (
        <div className="w-full">
            <div className="flex justify-end mb-2">
                <button 
                    type="button"
                    className="text-sm text-gray-600 underline cursor-pointer"
                    onClick={handleSwitchMode}
                >
                    {isTextMode ? 'Upload File Instead' : 'Paste Resume Text Instead'}
                </button>
            </div>

            {isTextMode ? (
                <div className="gradient-border">
                    <textarea 
                        className="w-full p-4 min-h-[200px] focus:outline-none rounded-xl"
                        placeholder="Paste your resume text here..."
                        value={resumeText}
                        onChange={handleTextChange}
                    />
                </div>
            ) : (
                <div className="gradient-border">
                    <div {...getRootProps()}>
                        <input {...getInputProps()} />

                        <div className="space-y-4 cursor-pointer">
                            {file ? (
                                <div className="uploader-selected-file" onClick={(e) => e.stopPropagation()}>
                                    <img 
                                        src={file.type === 'text/plain' ? "/icons/info.svg" : "/images/pdf.png"} 
                                        alt="file" 
                                        className="size-10" 
                                    />
                                    <div className="flex items-center space-x-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 truncate max-w-xs">
                                                {file.name}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatSize(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="p-2 cursor-pointer" onClick={(e) => {
                                        e.stopPropagation();
                                        onFileSelect?.(null);
                                    }}>
                                        <img src="/icons/cross.svg" alt="remove" className="w-4 h-4" />
                                    </button>
                                </div>
                            ): (
                                <div>
                                    <div className="mx-auto w-16 h-16 flex items-center justify-center mb-2">
                                        <img src="/icons/info.svg" alt="upload" className="size-20" />
                                    </div>
                                    <p className="text-lg text-gray-500">
                                        <span className="font-semibold">
                                            Click to upload
                                        </span> or drag and drop
                                    </p>
                                    <p className="text-lg text-gray-500">PDF or TXT (max {formatSize(maxFileSize)})</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
export default FileUploader
