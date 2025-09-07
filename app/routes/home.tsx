import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    if(!auth.isAuthenticated) navigate('/auth?next=/');
  }, [auth.isAuthenticated])

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      const resumes = (await kv.list('resume:*', true)) as KVItem[];

      const parsedResumes = resumes?.map((resume) => (
          JSON.parse(resume.value) as Resume
      ))

      setResumes(parsedResumes || []);
      setLoadingResumes(false);
    }

    loadResumes()
  }, []);

  return <main className="relative min-h-screen">
    <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
      <iframe src='https://my.spline.design/websitelandingpage08-u9C8ECwzlcBcjP5XXAJMIylW/' 
        frameBorder='0' 
        width='100%' 
        height='100%' 
        style={{ transform: 'scale(1.2)' }}
        className="pointer-events-auto"
      ></iframe>
    </div>
    <div className="relative z-10 pointer-events-auto">
      <Navbar />
    </div>

    <section className="main-section relative z-10 pointer-events-none">
      <div className="page-heading py-16 pointer-events-auto">
        <h1 className="drop-shadow-md">Track Your Applications & Resume Ratings</h1>
        {!loadingResumes && resumes?.length === 0 ? (
            <h2 className="drop-shadow-md font-medium">No resumes found. Upload your first resume to get feedback.</h2>
        ): (
          <h2 className="drop-shadow-md font-medium">Review your submissions and check AI-powered feedback.</h2>
        )}
      </div>
      {loadingResumes && (
          <div className="flex flex-col items-center justify-center pointer-events-auto">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
      )}

      {!loadingResumes && resumes.length > 0 && (
        <div className="resumes-section pointer-events-auto">
          {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}

      {!loadingResumes && resumes?.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4 pointer-events-auto">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold shadow-lg">
              Upload Resume
            </Link>
          </div>
      )}
    </section>
  </main>
}
