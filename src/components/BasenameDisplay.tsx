import { useEffect, useState } from 'react';
import { getBasename, formatWalletAddress } from '@/lib/basename';

interface BasenameDisplayProps {
  address: string;
  className?: string;
  showFull?: boolean;
}

/**
 * Display component that shows either the Basename or formatted wallet address
 */
export const BasenameDisplay = ({ address, className = '', showFull = false }: BasenameDisplayProps) => {
  const [basename, setBasename] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBasename = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        const name = await getBasename(address);
        setBasename(name);
      } catch (error) {
        console.error('Error fetching basename:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBasename();
  }, [address]);

  if (loading) {
    return <span className={className}>Loading...</span>;
  }

  const displayText = showFull && !basename 
    ? address 
    : formatWalletAddress(address, basename);

  return (
    <span className={className} title={address}>
      {displayText}
    </span>
  );
};
