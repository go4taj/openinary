export default function Footer() {
  return (
    <footer className="w-full border-t bg-white/50">
      <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Openinary — Demo
      </div>
    </footer>
  );
}
