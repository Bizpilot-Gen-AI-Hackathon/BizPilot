
import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileSpreadsheet,
  UploadCloud,
  X,
} from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = /\.(csv|xlsx|xls)$/i;

export default function UploadBox({ onFile }) {
  const inputRef = useRef(null);
  const animationRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!file) return undefined;

    setProgress(0);
    setAnimating(true);

    const start = Date.now();
    const duration = 850;

    function tick() {
      const elapsed = Date.now() - start;
      const nextProgress = Math.min(
        100,
        Math.round((elapsed / duration) * 100)
      );

      setProgress(nextProgress);

      if (nextProgress < 100) {
        animationRef.current = window.requestAnimationFrame(tick);
      } else {
        setAnimating(false);
      }
    }

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [file]);

  function choose(nextFile) {
    if (!nextFile) return;

    setError("");

    if (!ALLOWED_EXTENSIONS.test(nextFile.name)) {
      setError("Choose a CSV or Excel file (.csv, .xlsx, .xls).");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setError("This file exceeds 10 MB. Choose a smaller file.");
      return;
    }

    setFile(nextFile);
    onFile?.(nextFile);
  }

  function removeFile() {
    setFile(null);
    setProgress(0);
    setAnimating(false);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files?.[0]);
  }

  return (
    <div
      className={`upload-box ${dragging ? "is-dragging" : ""} ${
        file ? "has-file" : ""
      } ${animating ? "is-uploading" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
      aria-busy={animating}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {file ? (
        <div className="upload-selected">
          <span className={`upload-icon ${animating ? "upload-icon-active" : ""}`}>
            {animating ? (
              <UploadCloud size={22} />
            ) : (
              <FileSpreadsheet size={22} />
            )}
          </span>

          <div className="upload-file-info">
            <strong title={file.name}>{file.name}</strong>
            <span>
              {(file.size / 1024).toFixed(1)} KB
              {" · "}
              {animating ? "Preparing preview…" : "Ready for demo preview"}
            </span>

            <div
              className="upload-progress-track"
              role="progressbar"
              aria-label="File selection animation"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span
                className="upload-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={removeFile}
            aria-label="Remove selected file"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <span className={`upload-icon ${dragging ? "upload-icon-active" : ""}`}>
            <UploadCloud size={24} />
          </span>

          <strong>
            {dragging ? "Drop your file to get started" : "Drop your business data here"}
          </strong>

          <span>
            {dragging
              ? "Release to select your file"
              : "Upload sales or inventory records to get started"}
          </span>

          <button
            type="button"
            className="button button-secondary button-small"
            onClick={() => inputRef.current?.click()}
          >
            Choose a file
          </button>

          <small>CSV or Excel · Max 10 MB</small>
        </>
      )}

      {error && (
        <div className="upload-error" role="alert">
          {error}
        </div>
      )}

      {file && !animating && (
        <div className="upload-ready">
          <CheckCircle2 size={15} />
          File selected. Backend upload will be enabled when the endpoint is ready.
        </div>
      )}
    </div>
  );
}
