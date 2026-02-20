import { ReactNode } from 'react';

export default function FindItemsLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal?: ReactNode; // The '?' makes it optional, fixing the Vercel error
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}