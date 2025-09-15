'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { PlusIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Segment {
  id: number;
  name: string;
  description: string;
  rules: any;
  audience_size: number;
  created_at: string;
}

interface Rule {
  field: string;
  operator: string;
  value: any;
}

interface SegmentRule {
  operator: 'AND' | 'OR';
  conditions: (Rule | SegmentRule)[];
}

const fieldOptions = [
  { value: 'total_spent', label: 'Total Spent' },
  { value: 'total_orders', label: 'Total Orders' },
  { value: 'last_visit', label: 'Last Visit' },
  { value: 'status', label: 'Status' },
  { value: 'registration_date', label: 'Registration Date' },
];

const operatorOptions = {
  total_spent: [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'equals', label: 'Equals' },
    { value: 'between', label: 'Between' },
  ],
  total_orders: [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'equals', label: 'Equals' },
  ],
  last_visit: [
    { value: 'days_ago', label: 'Days ago' },
    { value: 'within_days', label: 'Within days' },
    { value: 'is_null', label: 'Is null' },
  ],
  status: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' },
  ],
  registration_date: [
    { value: 'after', label: 'After' },
    { value: 'before', label: 'Before' },
    { value: 'between', label: 'Between' },
  ],
};

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'churned', label: 'Churned' },
];

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: {
      operator: 'AND' as 'AND' | 'OR',
      conditions: [] as (Rule | SegmentRule)[],
    },
  });

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSegments(data.segments);
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
      toast.error('Failed to fetch segments');
    } finally {
      setLoading(false);
    }
  };

  const handleAiConversion = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a natural language description');
      return;
    }

    setAiLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/ai/natural-language-to-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          rules: data.rules,
        }));
        toast.success('AI converted your description to rules!');
      } else {
        toast.error('Failed to convert natural language to rules');
      }
    } catch (error) {
      console.error('AI conversion error:', error);
      toast.error('Failed to convert natural language to rules');
    } finally {
      setAiLoading(false);
    }
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        conditions: [
          ...prev.rules.conditions,
          { field: 'total_spent', operator: 'greater_than', value: 0 },
        ],
      },
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        conditions: prev.rules.conditions.filter((_, i) => i !== index),
      },
    }));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        conditions: prev.rules.conditions.map((condition, i) =>
          i === index ? { ...condition, [field]: value } : condition
        ),
      },
    }));
  };

  const previewSegment = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/segments/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rules: formData.rules }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        setShowPreview(true);
      } else {
        toast.error('Failed to preview segment');
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview segment');
    }
  };

  const createSegment = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a segment name');
      return;
    }

    if (formData.rules.conditions.length === 0) {
      toast.error('Please add at least one condition');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/segments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Segment created successfully!');
        setShowCreateForm(false);
        setFormData({
          name: '',
          description: '',
          rules: { operator: 'AND', conditions: [] },
        });
        fetchSegments();
      } else {
        toast.error('Failed to create segment');
      }
    } catch (error) {
      console.error('Create segment error:', error);
      toast.error('Failed to create segment');
    }
  };

  const renderValueInput = (condition: Rule, index: number) => {
    const { field, operator, value } = condition;

    switch (field) {
      case 'total_spent':
      case 'total_orders':
        if (operator === 'between') {
          return (
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={value?.min || ''}
                onChange={(e) => updateCondition(index, 'value', { ...value, min: parseFloat(e.target.value) })}
                className="input"
              />
              <input
                type="number"
                placeholder="Max"
                value={value?.max || ''}
                onChange={(e) => updateCondition(index, 'value', { ...value, max: parseFloat(e.target.value) })}
                className="input"
              />
            </div>
          );
        }
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => updateCondition(index, 'value', parseFloat(e.target.value))}
            className="input"
            placeholder="Enter value"
          />
        );

      case 'last_visit':
        if (operator === 'is_null') {
          return <span className="text-gray-500">No value needed</span>;
        }
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => updateCondition(index, 'value', parseInt(e.target.value))}
            className="input"
            placeholder="Number of days"
          />
        );

      case 'status':
        return (
          <select
            value={value || ''}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            className="input"
          >
            <option value="">Select status</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'registration_date':
        if (operator === 'between') {
          return (
            <div className="flex space-x-2">
              <input
                type="date"
                value={value?.start || ''}
                onChange={(e) => updateCondition(index, 'value', { ...value, start: e.target.value })}
                className="input"
              />
              <input
                type="date"
                value={value?.end || ''}
                onChange={(e) => updateCondition(index, 'value', { ...value, end: e.target.value })}
                className="input"
              />
            </div>
          );
        }
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            className="input"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateCondition(index, 'value', e.target.value)}
            className="input"
            placeholder="Enter value"
          />
        );
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Segments</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage customer segments for targeted campaigns
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Segment
            </button>
          </div>

          {/* AI Natural Language Input */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              🤖 AI-Powered Segment Creation
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Describe your target audience in natural language and let AI convert it to segment rules.
            </p>
            <div className="flex space-x-4">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., 'People who spent more than ₹10,000 and haven't visited in 30 days'"
                className="input flex-1"
              />
              <button
                onClick={handleAiConversion}
                disabled={aiLoading}
                className="btn btn-primary"
              >
                {aiLoading ? 'Converting...' : 'Convert to Rules'}
              </button>
            </div>
          </div>

          {/* Segments List */}
          <div className="grid grid-cols-1 gap-4">
            {segments.map((segment) => (
              <div key={segment.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{segment.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{segment.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-500">
                        Audience: {segment.audience_size} customers
                      </span>
                      <span className="text-sm text-gray-500">
                        Created: {new Date(segment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="btn btn-secondary text-sm">
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <a
                      href={`/campaigns?segment=${segment.id}`}
                      className="btn btn-primary text-sm"
                    >
                      Create Campaign
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {segments.length === 0 && (
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No segments yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first customer segment.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn btn-primary"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Segment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create Segment Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Segment</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Segment Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input"
                      placeholder="e.g., High Value Customers"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="input"
                      rows={3}
                      placeholder="Describe this segment..."
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Segment Rules
                      </label>
                      <div className="flex space-x-2">
                        <select
                          value={formData.rules.operator}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            rules: { ...prev.rules, operator: e.target.value as 'AND' | 'OR' }
                          }))}
                          className="input text-sm"
                        >
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                        <button onClick={addCondition} className="btn btn-secondary text-sm">
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add Condition
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {formData.rules.conditions.map((condition, index) => (
                        <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                          <select
                            value={condition.field}
                            onChange={(e) => updateCondition(index, 'field', e.target.value)}
                            className="input text-sm"
                          >
                            {fieldOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                            className="input text-sm"
                          >
                            {operatorOptions[condition.field as keyof typeof operatorOptions]?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <div className="flex-1">
                            {renderValueInput(condition as Rule, index)}
                          </div>

                          <button
                            onClick={() => removeCondition(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={previewSegment}
                    className="btn btn-secondary"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    Preview
                  </button>
                  <button
                    onClick={createSegment}
                    className="btn btn-primary"
                  >
                    Create Segment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Segment Preview</h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    This segment will target <strong>{previewData.audienceSize}</strong> customers.
                  </p>
                </div>

                {previewData.sampleCustomers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Sample Customers:</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Spent
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.sampleCustomers.map((customer: any) => (
                            <tr key={customer.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {customer.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {customer.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ₹{customer.total_spent}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`badge ${
                                  customer.status === 'active' ? 'badge-success' :
                                  customer.status === 'inactive' ? 'badge-warning' :
                                  'badge-danger'
                                }`}>
                                  {customer.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
