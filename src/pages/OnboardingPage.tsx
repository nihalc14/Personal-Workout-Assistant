import { useState } from 'react';
import { saveProfile } from '../logic/profile';
import type { ExperienceLevel, FitnessGoal, Sex, UserProfile } from '../types';

const GOALS: { value: FitnessGoal; label: string; hint: string }[] = [
  { value: 'build-strength', label: 'Build Strength', hint: 'Get stronger on the big lifts' },
  { value: 'lose-fat', label: 'Lose Fat', hint: 'Train to support a calorie deficit' },
  { value: 'stay-consistent', label: 'Stay Consistent', hint: 'Build the habit of showing up' },
  { value: 'general-fitness', label: 'General Fitness', hint: 'Feel healthy and move well' },
];

const LEVELS: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: 'beginner', label: 'Beginner', hint: 'New to lifting, or less than a year in' },
  { value: 'intermediate', label: 'Intermediate', hint: '1–3 years of consistent training' },
  { value: 'advanced', label: 'Advanced', hint: '3+ years, close to your potential' },
];

interface Props {
  onComplete: (profile: UserProfile) => void;
}

export default function OnboardingPage({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [error, setError] = useState('');

  const ageNum = Number(age);
  const aboutYouValid = name.trim().length > 0 && age !== '' && ageNum >= 10 && ageNum <= 100 && sex !== null;

  function nextFromAboutYou() {
    if (!aboutYouValid) {
      setError('Please fill in your name, a valid age (10–100), and select an option.');
      return;
    }
    setError('');
    setStep(1);
  }

  function finish() {
    if (!goal || !experience || !sex) return;
    const profile: UserProfile = {
      name: name.trim(),
      age: ageNum,
      sex,
      goal,
      experience,
    };
    saveProfile(profile);
    onComplete(profile);
  }

  return (
    <div className="onboarding">
      <div className="onboarding-progress">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`onboarding-dot${i <= step ? ' filled' : ''}`} />
        ))}
      </div>

      {step === 0 && (
        <div>
          <h1>Welcome</h1>
          <p className="muted">Tell us a bit about yourself to get started.</p>

          <label className="onboarding-label">Name</label>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />

          <label className="onboarding-label">Age</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Your age"
            min={10}
            max={100}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />

          <label className="onboarding-label">Sex</label>
          <div className="btn-row">
            {(['male', 'female'] as Sex[]).map((s) => (
              <button
                key={s}
                className={`btn option-toggle${sex === s ? ' selected' : ''}`}
                onClick={() => setSex(s)}
              >
                {s === 'male' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="btn onboarding-next" onClick={nextFromAboutYou}>
            Next
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1>Your goal</h1>
          <p className="muted">What are you mainly training for?</p>

          {GOALS.map((g) => (
            <button
              key={g.value}
              className={`option-card${goal === g.value ? ' selected' : ''}`}
              onClick={() => setGoal(g.value)}
            >
              <strong>{g.label}</strong>
              <span className="muted">{g.hint}</span>
            </button>
          ))}

          <div className="btn-row">
            <button className="btn secondary" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="btn onboarding-grow" disabled={!goal} onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1>Experience</h1>
          <p className="muted">How long have you been training?</p>

          {LEVELS.map((l) => (
            <button
              key={l.value}
              className={`option-card${experience === l.value ? ' selected' : ''}`}
              onClick={() => setExperience(l.value)}
            >
              <strong>{l.label}</strong>
              <span className="muted">{l.hint}</span>
            </button>
          ))}

          <div className="btn-row">
            <button className="btn secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn onboarding-grow" disabled={!experience} onClick={finish}>
              Get started
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
