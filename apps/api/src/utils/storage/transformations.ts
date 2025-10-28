import fs from "fs";
import path from "path";

const TRANSFORMATIONS_FILE = path.join(process.cwd(), "transformations.json");

// Ensure file exists with empty array
if (!fs.existsSync(TRANSFORMATIONS_FILE)) {
  fs.writeFileSync(TRANSFORMATIONS_FILE, "[]", "utf-8");
}

interface Transformation {
  id: string;
  name: string;
  config: string;
  createdAt: string;
}

export function listTransformations(): Transformation[] {
  try {
    const data = fs.readFileSync(TRANSFORMATIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading transformations:", error);
    return [];
  }
}

export function createTransformation(name: string, config: string): Transformation {
  try {
    const transformations = listTransformations();
    const newTransformation = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      config,
      createdAt: new Date().toISOString(),
    };
    
    transformations.push(newTransformation);
    fs.writeFileSync(TRANSFORMATIONS_FILE, JSON.stringify(transformations, null, 2), "utf-8");
    
    return newTransformation;
  } catch (error) {
    console.error("Error creating transformation:", error);
    throw new Error("Failed to create transformation");
  }
}

export function deleteTransformation(id: string): boolean {
  try {
    const transformations = listTransformations();
    const filteredTransformations = transformations.filter(t => t.id !== id);
    
    if (filteredTransformations.length === transformations.length) {
      return false; // Nothing was deleted
    }
    
    fs.writeFileSync(TRANSFORMATIONS_FILE, JSON.stringify(filteredTransformations, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error deleting transformation:", error);
    return false;
  }
}