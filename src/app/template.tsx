export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ animation: 'page-in 0.16s ease-out both' }}>
      {children}
    </div>
  )
}
