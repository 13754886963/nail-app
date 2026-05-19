import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function PublishPlaceholder() {
  const router = useRouter();
  useEffect(() => { router.replace('/works/upload'); }, []);
  return null;
}
