export type ShareResult = 'shared' | 'copied' | 'failed';

export async function shareItem(itemId: string | number, itemName: string): Promise<ShareResult> {
  const url = `${window.location.origin}/find-items/${itemId}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: itemName,
        text: `Check out "${itemName}" on The Playa Provides`,
        url,
      });
      return 'shared';
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return 'failed';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (err: unknown) {
    console.error('Copy failed:', err);
    return 'failed';
  }
}
