import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { User, ChoreAssignment, ChoreTemplate, ChoreCategory, Notification } from '../types';

// Mock data generators
export const mockUser = (overrides?: Partial<User>): User => ({
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'PARENT',
  points: 100,
  basePocketMoney: 5,
  color: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const mockChild = (overrides?: Partial<User>): User => ({
  id: 2,
  email: 'child@example.com',
  name: 'Child User',
  role: 'CHILD',
  points: 50,
  basePocketMoney: 3,
  color: '#FF5733',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const mockCategory = (overrides?: Partial<ChoreCategory>): ChoreCategory => ({
  id: 1,
  name: 'Cleaning',
  description: 'Cleaning tasks',
  icon: 'broom',
  color: '#4CAF50',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockTemplate = (overrides?: Partial<ChoreTemplate>): ChoreTemplate => ({
  id: 1,
  title: 'Test Template',
  description: 'Test template description',
  points: 15,
  icon: 'star',
  color: '#FFC107',
  categoryId: 1,
  category: {
    id: 1,
    name: 'Cleaning',
  },
  createdById: 1,
  createdBy: {
    id: 1,
    name: 'Test User',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const mockChoreAssignment = (overrides?: Partial<ChoreAssignment>): ChoreAssignment => ({
  id: 1,
  choreTemplateId: 1,
  choreTemplate: mockTemplate(),
  assignedToId: 2,
  assignedTo: {
    id: 2,
    name: 'Child User',
    color: '#FF5733',
  },
  dueDate: new Date().toISOString(),
  status: 'PENDING',
  notes: null,
  createdAt: new Date().toISOString(),
  completedAt: null,
  isOverdue: false,
  ...overrides,
});

export const mockNotification = (overrides?: Partial<Notification>): Notification => ({
  id: 1,
  userId: 1,
  type: 'CHORE_ASSIGNED',
  title: 'New Chore Assigned',
  message: 'You have been assigned a new chore',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Custom render with router
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

export const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
