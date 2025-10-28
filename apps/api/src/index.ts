import { Hono } from "hono";
import transform from "./routes/transform";
import { signJwt, verifyJwt } from "./utils/jwt";
import { listTransformations, createTransformation, deleteTransformation } from "./utils/storage/transformations";

const app = new Hono();

// Simple CORS middleware for demo/dev
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use("/*", async (c, next) => {
	const origin = CORS_ORIGIN;
	c.header("Access-Control-Allow-Origin", origin);
	c.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
	c.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
	// If it's a preflight request, respond immediately
	if (c.req.method === "OPTIONS") return c.text("ok", 200);
	await next();
	return c.res;
});

// Routes
app.get("/", (c) => c.text("Server is running."));
app.route("/t", transform);
app.get("/health", (c) => c.text("ok"));

// List media files from local public folder (demo)
app.get("/media", async (c) => {
    try {
        // read files in ./public
        const fs = await import("fs");
        const path = await import("path");
        const publicDir = path.resolve(process.cwd(), "./public");
        if (!fs.existsSync(publicDir)) return c.json([], 200);

        // build base URL from request (respect x-forwarded-proto if present)
        const host = c.req.header("host") || "localhost";
        const proto =
            c.req.header("x-forwarded-proto") ||
            (c.req.header("forwarded")?.includes("proto=https") ? "https" : "http");
        const base = `${proto}://${host}`;

        const files = fs.readdirSync(publicDir);
        const items = files.map((f: string) => {
            const full = path.join(publicDir, f);
            const stat = fs.statSync(full);
            const ext = path.extname(f).toLowerCase();
            const type = ext === ".mp4" || ext === ".mov" ? "video" : "image";
            // include the current server as a url param
            const url = `${base}/public/${encodeURIComponent(f)}`;
            return {
                name: f,
                url,
                size: stat.size,
                type,
            };
        });
        return c.json(items);
    } catch (err) {
        return c.json({ error: "failed" }, 500);
    }
});

// Serve static files from apps/api/public at /public/<file>
app.get("/public/*", async (c) => {
	try {
		const fs = await import("fs");
		const path = await import("path");
		const requested = c.req.url.replace(/^(?:https?:\/\/[^/]+)?/, "");
		// requested will be like /public/filename
		const rel = requested.replace(/^\/public\//, "");
		const publicDir = path.resolve(process.cwd(), "./public");
		const full = path.join(publicDir, rel);
		if (!fs.existsSync(full)) return c.text("Not found", 404);
		const data = fs.readFileSync(full);
		const ext = path.extname(full).toLowerCase();
		let type = "application/octet-stream";
		if (ext === ".png") type = "image/png";
		else if (ext === ".jpg" || ext === ".jpeg") type = "image/jpeg";
		else if (ext === ".webp") type = "image/webp";
		else if (ext === ".mp4") type = "video/mp4";
		c.header("Content-Type", type);
		return c.body(data);
	} catch (err) {
		return c.text("Error", 500);
	}
});

// Demo credentials
const DEMO_USER = {
	username: "demo@openinary.local",
	password: "demo1234",
};

// Simple login route that returns a JWT for demo credentials
app.post(
	"/login",
	async (c) => {
		try {
			const body = await c.req.json().catch(() => ({}));
			const { username, password } = body as { username?: string; password?: string };

			if (username === DEMO_USER.username && password === DEMO_USER.password) {
				const token = signJwt({ sub: username, iss: "openinary", exp: Math.floor(Date.now() / 1000) + 60 * 60 });
				return c.json({ token }, 200);
			}

			return c.json({ error: "Invalid credentials" }, 401);
		} catch (err) {
			return c.json({ error: "Invalid request" }, 400);
		}
	}
);

	// Protected route to return current user info if JWT is valid
	app.get("/me", (c) => {
		const auth = c.req.header("Authorization") || "";
		if (!auth.startsWith("Bearer ")) return c.json({ error: "Missing token" }, 401);
		const token = auth.replace(/^Bearer\s+/i, "");
		const payload = verifyJwt(token);
		if (!payload) return c.json({ error: "Invalid token" }, 401);

		return c.json({ username: payload.sub || null });
	});

	// Transformations CRUD (stored in local sqlite DB)
	app.get("/transformations", (c) => {
		try {
			const rows = listTransformations();
			return c.json(rows);
		} catch (err) {
			return c.json({ error: "failed" }, 500);
		}
	});

	app.post("/transformations", async (c) => {
		try {
			const body = await c.req.json().catch(() => ({}));
			const { name, spec } = body as { name?: string; spec?: string };
			if (!name) return c.json({ error: "name required" }, 400);
			const row = createTransformation(name, spec?.toString() || "");
			return c.json(row, 201);
		} catch (err) {
			return c.json({ error: "failed" }, 500);
		}
	});

	app.delete("/transformations/:id", (c) => {
		try {
			const id = c.req.param("id");
			if (!id) return c.json({ error: "invalid id" }, 400);
			const ok = deleteTransformation(id);
			return c.json({ ok });
		} catch (err) {
			return c.json({ error: "failed" }, 500);
		}
	});

export default app;
