import { useState, useEffect } from 'preact/hooks';

const roles = [
  "Mobile & Web Developer",
  "AI & Machine Learning Enthusiast",
  "Building Seamless Digital Experiences"
];

export default function Typewriter() {
  const [text, setText] = useState("");
  const [roleIndex, setRoleIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: number;
    const currentRole = roles[roleIndex];

    if (!isDeleting) {
      if (charIndex < currentRole.length) {
        // Typing with human-like randomness (speed variance)
        const typingSpeed = 50 + Math.random() * 60; // Random speed between 50ms and 110ms
        timeout = window.setTimeout(() => {
          setText(currentRole.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, typingSpeed);
      } else {
        // End of word, pause before deleting
        timeout = window.setTimeout(() => {
          setIsDeleting(true);
        }, 2000); // 2 second pause
      }
    } else {
      if (charIndex > 0) {
        // Deleting
        timeout = window.setTimeout(() => {
          setText(currentRole.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, 30); // 30ms deleting speed
      } else {
        // Finished deleting, pause before next word
        timeout = window.setTimeout(() => {
          setIsDeleting(false);
          setRoleIndex((roleIndex + 1) % roles.length);
        }, 300); // 300ms pause
      }
    }

    return () => clearTimeout(timeout);
  }, [roleIndex, charIndex, isDeleting]);

  const currentRole = roles[roleIndex];
  const isPaused = charIndex === 0 || charIndex === currentRole.length;

  return (
    <>
      {text}
      <span class={`font-light text-accent ml-[2px] ${isPaused ? 'animate-type-blink' : ''}`}>|</span>
    </>
  );
}
