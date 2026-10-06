import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// A search link only seeds the existing filter; editing/clearing it behaves as before.
export default function useSearchPrefill() {
  const [params] = useSearchParams();
  const initial = (params.get('search') || '').slice(0, 254);
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(initial); }, [initial]);
  return [value, setValue];
}
