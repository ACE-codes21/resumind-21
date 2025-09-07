import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState<string | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file);
        // Clear resume text if a file is selected
        if (file) setResumeText(null);
    }
    
    const handleTextInput = (text: string | null) => {
        setResumeText(text);
        // Clear file if text is provided
        if (text) setFile(null);
    }

    const handleAnalyze = async ({ 
        companyName, 
        jobTitle, 
        jobDescription, 
        file,
        resumeText 
    }: { 
        companyName: string, 
        jobTitle: string, 
        jobDescription: string, 
        file?: File,
        resumeText?: string
    }) => {
        setIsProcessing(true);

        let uploadedFile;
        let imageFile;
        let uploadedImage;

        // Handle file upload or text content
        if (file) {
            setStatusText('Uploading the file...');
            uploadedFile = await fs.upload([file]);
            if (!uploadedFile) return setStatusText('Error: Failed to upload file');

            if (file.type === 'application/pdf') {
                setStatusText('Converting to image...');
                imageFile = await convertPdfToImage(file);
                if (!imageFile.file) return setStatusText('Error: Failed to convert PDF to image');
                
                setStatusText('Uploading the image...');
                uploadedImage = await fs.upload([imageFile.file]);
                if (!uploadedImage) return setStatusText('Error: Failed to upload image');
            }
        } else if (resumeText) {
            setStatusText('Processing text input...');
            // Create a text file from the input
            const textBlob = new Blob([resumeText], { type: 'text/plain' });
            const textFile = new File([textBlob], 'resume.txt', { type: 'text/plain' });
            
            // Upload the text file
            uploadedFile = await fs.upload([textFile]);
            if (!uploadedFile) return setStatusText('Error: Failed to process text input');
        } else {
            return setStatusText('Error: No resume content provided');
        }

        setStatusText('Preparing data...');
        const uuid = generateUUID();
        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            // Only include image path if it exists
            imagePath: uploadedImage?.path || '',
            companyName, 
            jobTitle, 
            jobDescription,
            isTextOnly: !uploadedImage,
            feedback: '',
        }
        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setStatusText('Analyzing...');

        const feedback = await ai.feedback(
            uploadedFile.path,
            prepareInstructions({ jobTitle, jobDescription })
        )
        if (!feedback) return setStatusText('Error: Failed to analyze resume');

        const feedbackText = typeof feedback.message.content === 'string'
            ? feedback.message.content
            : feedback.message.content[0].text;

        data.feedback = JSON.parse(feedbackText);
        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        setStatusText('Analysis complete, redirecting...');
        console.log(data);
        navigate(`/resume/${uuid}`);
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        // Check if either file or resumeText is provided
        if (!file && !resumeText) {
            alert('Please upload a resume file or paste resume text');
            return;
        }

        handleAnalyze({ 
            companyName, 
            jobTitle, 
            jobDescription, 
            file: file || undefined,
            resumeText: resumeText || undefined
        });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume or Paste Text</label>
                                <FileUploader 
                                    onFileSelect={handleFileSelect}
                                    onTextInput={handleTextInput} 
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Note: Your resume content is processed securely and is not stored or publicly exposed.
                                    It is only used for analysis purposes and is automatically deleted after processing.
                                </p>
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
