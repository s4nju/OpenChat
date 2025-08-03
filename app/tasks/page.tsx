import LayoutApp from '@/app/components/layout/layout-app';
import { ScheduledTasksPage } from '@/app/components/scheduled-tasks/scheduled-tasks-page';

export const dynamic = 'force-dynamic';

export default function TasksPage() {
  return (
    <LayoutApp>
      <ScheduledTasksPage />
    </LayoutApp>
  );
}
