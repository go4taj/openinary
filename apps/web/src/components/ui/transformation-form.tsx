"use client";

import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

interface TransformationFormProps {
  onSubmit: (name: string, config: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
}

export function TransformationForm({ onSubmit, onCancel }: TransformationFormProps) {
  const [name, setName] = useState("");
  const [config, setConfig] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      const configObj = config ? JSON.parse(config) : {};
      await onSubmit(name.trim(), configObj);
      setName("");
      setConfig("");
    } catch (err) {
      setError(err instanceof SyntaxError ? "Invalid JSON configuration" : "Failed to save transformation");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Thumbnail 150x150"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="config">Configuration (JSON)</Label>
        <textarea
          id="config"
          value={config}
          onChange={(e) => setConfig(e.target.value)}
          placeholder={`{
  "width": 150,
  "height": 150,
  "fit": "cover"
}`}
          className="w-full min-h-[120px] p-2 text-sm rounded-md border border-gray-300 bg-transparent"
        />
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Save Transformation</Button>
      </div>
    </form>
  );
}