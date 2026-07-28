// src/pages/b2b/B2BOnboardingPage.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import B2BOnboardingWizard from './B2BOnboardingWizard';

export default function B2BOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleComplete = (action) => {
    if (action === 'order') navigate('/b2b/order');
    else if (action === 'invite') navigate('/b2b/teams');
    else navigate('/b2b');
  };

  return <B2BOnboardingWizard user={user} onComplete={handleComplete} />;
}
