import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        const loadResume = async () => {
            const resume = await kv.get(`resume:${id}`);

            if(!resume) return;

            const data = JSON.parse(resume);
            
            // Handle resume file
            const resumeBlob = await fs.read(data.resumePath);
            if(resumeBlob) {
                // Determine file type based on data or extension
                const fileType = data.resumePath.endsWith('.txt') ? 'text/plain' : 'application/pdf';
                const blob = new Blob([resumeBlob], { type: fileType });
                const resumeUrl = URL.createObjectURL(blob);
                setResumeUrl(resumeUrl);
            }

            // Handle image file if it exists
            if (data.imagePath && !data.isTextOnly) {
                const imageBlob = await fs.read(data.imagePath);
                if(imageBlob) {
                    const imageUrl = URL.createObjectURL(imageBlob);
                    setImageUrl(imageUrl);
                }
            }

            setFeedback(data.feedback);
            console.log({resumeUrl, imageUrl, feedback: data.feedback, isTextOnly: data.isTextOnly });
        }

        loadResume();
    }, [id]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl ? (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    ) : resumeUrl && !imageUrl ? (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center justify-center h-full p-8 bg-white rounded-2xl">
                                <div className="text-center">
                                    <img src="/icons/info.svg" alt="text resume" className="size-20 mx-auto mb-4" />
                                    <p className="text-xl font-medium text-gray-800">Text Resume</p>
                                    <p className="text-sm text-gray-600 mt-2">Click to view content</p>
                                </div>
                            </a>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit flex items-center justify-center">
                            <div className="p-8 flex flex-col items-center justify-center">
                                <img src="/images/resume-scan-2.gif" className="w-[200px]" />
                                <p className="text-gray-600 mt-4">Loading resume...</p>
                            </div>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                            <Details feedback={feedback} />
                        </div>
                    ) : (
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
