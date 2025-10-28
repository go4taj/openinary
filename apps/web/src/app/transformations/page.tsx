"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Transformation {
  id: string;
  name: string;
  config: string;
}

export default function TransformationsPage() {
  const [items, setItems] = useState<Transformation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newConfig, setNewConfig] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadTransformations();
  }, []);

  const loadTransformations = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    try {
      const res = await fetch(apiBase ? `${apiBase}/transformations` : `/transformations`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.error("Failed to load transformations:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newName.trim()) {
      setError("Name is required");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    try {
      const res = await fetch(apiBase ? `${apiBase}/transformations` : `/transformations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newName.trim(), 
          spec: newConfig
        }),
      });
      
      if (!res.ok) throw new Error("Failed to create transformation");
      
      await loadTransformations();
      setNewName("");
      setNewConfig("");
      setShowForm(false);
    } catch (err) {
      setError("Failed to create transformation");
      console.error("Failed to create transformation:", err);
    }
  };

  const handleDelete = async (id: string) => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    try {
      const res = await fetch(`${apiBase ? `${apiBase}/transformations/${id}` : `/transformations/${id}`}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete transformation");
      await loadTransformations();
    } catch (err) {
      console.error("Failed to delete transformation:", err);
    }
  };

  return (
    <div className="p-6">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button onClick={() => setShowForm(true)} variant="outline">
            Add New Transformation
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-card border border-border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Thumbnail 150x150"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="config">Configuration</Label>
              <Input
                id="config"
                value={newConfig}
                onChange={(e) => setNewConfig(e.target.value)}
                placeholder="w_150,h_150,c_fill"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Transformation</Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {items.map((item) => (
            <div 
              key={item.id}
              className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
            >
              <div className="flex-1 min-w-0 mr-4">
                <h3 className="font-medium mb-1">{item.name}</h3>
                <div className="text-sm text-muted-foreground truncate">{item.config}</div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}