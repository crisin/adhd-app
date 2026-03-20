import express from 'express';
import { initDb } from './db';
import { requireUser } from './middleware';
import tasksRouter from './routes/tasks';
import subtasksRouter from './routes/subtasks';
import labelsRouter from './routes/labels';
import taskLabelsRouter from './routes/task-labels';
import goalsRouter from './routes/goals';
import ideasRouter from './routes/ideas';
import roomsRouter from './routes/rooms';
import inventoryRouter from './routes/inventory';
import plantsRouter from './routes/plants';
import calendarRouter from './routes/calendar';
import remindersRouter from './routes/reminders';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(express.json());

// Apply requireUser middleware to all /api routes
app.use('/api', requireUser);

// Mount route handlers
app.use('/api/tasks', tasksRouter);
app.use('/api/subtasks', subtasksRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/task-labels', taskLabelsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/ideas', ideasRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/plants', plantsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/reminders', remindersRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

async function main() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`ADHD backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
