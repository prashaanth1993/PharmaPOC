const STAGES = ['Ingest', 'Extract', 'Classify', 'Enrich', 'Validate', 'Publish'];

export default function UploadStepper({ stage }) {
  const currentIndex = STAGES.indexOf(stage);
  return (
    <ol className="upload-stepper">
      {STAGES.map((s, i) => {
        const status = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending';
        return <li key={s} className={status}>{s}</li>;
      })}
    </ol>
  );
}
