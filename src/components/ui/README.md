# Widgetizer Design System

A comprehensive UI component library built with Tailwind CSS v4.1, featuring modern colors, consistent spacing, and accessible components.

## 🎨 Design Tokens

### Colors

- **Primary**: Modern pink palette using oklch color space for better accuracy
- **Neutral**: Enhanced gray scale with subtle color temperature
- **Semantic**: Success (green), Warning (yellow), Error (red)

### Typography

- **Font Stack**: Inter for UI, JetBrains Mono for code
- **Scale**: Harmonious type scale from xs to 3xl
- **Weight**: Strategic use of font weights for hierarchy

### Spacing

- **Consistent Scale**: From xs (0.5rem) to 3xl (3rem)
- **Semantic Usage**: Tight, base, comfortable, relaxed spacing

## 🧩 Core Components

### Button

```jsx
import { Button, IconButton } from '@/components/ui';

// Variants
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="ghost">Ghost Action</Button>
<Button variant="danger">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// With icons
<Button icon={<Plus />} iconPosition="left">Add Item</Button>
<Button loading>Saving...</Button>

// Icon-only buttons
<IconButton variant="neutral"><Edit /></IconButton>
<IconButton variant="danger"><Trash /></IconButton>
```

### Card

```jsx
import { Card, StructuredCard, CardHeader, CardBody, CardFooter } from '@/components/ui';

// Simple cards
<Card variant="content">Basic content</Card>
<Card variant="feature">Featured content with shadow</Card>
<Card variant="compact">Compact spacing</Card>

// Structured cards
<StructuredCard
  header={<h3>Card Title</h3>}
  footer={<Button>Action</Button>}
>
  Card content goes here
</StructuredCard>
```

### Table

```jsx
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  TableActions,
  TableEmptyState,
} from "@/components/ui";

<Table>
  <TableHead>
    <TableRow>
      <TableHeader>Name</TableHeader>
      <TableHeader>Status</TableHeader>
      <TableHeader className="text-end">Actions</TableHeader>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>
        <Badge variant="success">Active</Badge>
      </TableCell>
      <TableActions>
        <IconButton>
          <Edit />
        </IconButton>
        <IconButton variant="danger">
          <Trash />
        </IconButton>
      </TableActions>
    </TableRow>
    {/* Empty state */}
    <TableEmptyState colSpan={3} message="No users found" action={<Button>Add User</Button>} />
  </TableBody>
</Table>;
```

### Forms

```jsx
import { FormField, Input, Textarea, Select, Checkbox, Radio, FormGroup, FormActions } from "@/components/ui";

<FormGroup>
  <FormField label="Name" required error={errors.name}>
    <Input placeholder="Enter your name" />
  </FormField>

  <FormField label="Description" help="Tell us about yourself">
    <Textarea placeholder="Enter description" />
  </FormField>

  <FormField label="Country">
    <Select placeholder="Select country">
      <option value="us">United States</option>
      <option value="ca">Canada</option>
    </Select>
  </FormField>

  <Checkbox label="I agree to the terms" />

  <FormActions>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Save</Button>
  </FormActions>
</FormGroup>;
```

### Status Components

```jsx
import { Badge, EmptyState } from '@/components/ui';

// Badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="primary">New</Badge>

// Empty states
<EmptyState
  icon={<AlertCircle size={48} />}
  title="No Projects Found"
  description="Get started by creating your first project"
  action={<Button>Create Project</Button>}
/>
```

## 🎯 Layout Components

### PageLayout

```jsx
import PageLayout from "@/components/layout/PageLayout";

<PageLayout
  title="Page Title"
  description="Optional description"
  buttonProps={{
    onClick: handleAdd,
    children: "Add Item",
    icon: <Plus />,
  }}
>
  <YourContent />
</PageLayout>;
```

## 🎨 CSS Classes

### Direct Class Usage

When you need more control, use the component classes directly:

```jsx
// Buttons
<button className="btn btn-primary btn-lg">Large Primary</button>
<button className="btn-icon-neutral"><Edit /></button>

// Cards
<div className="card-feature">Featured content</div>
<div className="card-content">Regular content</div>

// Tables
<table className="table-modern">
  <thead>
    <tr>
      <th>Header</th>
    </tr>
  </thead>
</table>

// Forms
<input className="form-input" />
<input className="form-input-error" /> {/* Error state */}
<span className="form-error">Error message</span>

// Typography
<h1 className="text-page-title">Page Title</h1>
<h2 className="text-section-title">Section</h2>
<p className="text-body">Body text</p>
<span className="text-caption">Caption text</span>

// Layout
<div className="page-container">
  <div className="page-header">
    <h1>Title</h1>
    <button>Action</button>
  </div>
  <div className="page-content">
    Content with consistent spacing
  </div>
</div>
```

## 🚀 Migration Guide

### From Old Patterns

```jsx
// Before
<button className="px-4 py-2 bg-pink-600 text-white rounded-sm hover:bg-pink-700">
  Action
</button>

// After
<Button variant="primary">Action</Button>

// Before
<div className="bg-white rounded-lg shadow-lg shadow-slate-200 p-4">
  Content
</div>

// After
<Card variant="content">Content</Card>

// Before
<table className="w-full">
  <thead>
    <tr className="border-b-2 border-slate-200">
      <th className="text-left py-3 px-4">Name</th>
    </tr>
  </thead>
</table>

// After
<Table>
  <TableHead>
    <TableRow>
      <TableHeader>Name</TableHeader>
    </TableRow>
  </TableHead>
</Table>
```

## 🎯 Best Practices

1. **Use Components First**: Always prefer React components over direct CSS classes
2. **Consistent Spacing**: Use the spacing scale (xs, sm, base, lg, xl, 2xl, 3xl)
3. **Semantic Colors**: Use success/warning/error for status, primary for branding
4. **Accessible Forms**: Always include labels and error states
5. **Empty States**: Provide helpful empty states with clear actions

## 🔧 Customization

The design system is built on CSS custom properties, making it easy to customize:

```css
:root {
  /* Override any design token */
  --color-primary-600: oklch(0.58 0.28 280); /* Blue instead of pink */
  --font-sans: "Your Font", system-ui, sans-serif;
}
```

## 📚 Resources

- [Tailwind CSS v4.1 Documentation](https://tailwindcss.com/)
- [oklch Color Space](https://oklch.com/)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
