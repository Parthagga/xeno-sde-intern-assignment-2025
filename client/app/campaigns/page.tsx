'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { PlusIcon, EyeIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Campaign {
  id: number;
  name: string;
  description: string;
  segment_name: string;
  audience_size: number;
  status: string;
  sent_at: string;
  total_messages: number;
  sent_messages: number;
  failed_messages: number;
  created_at: string;
}

interface Segment {
  id: number;
  name: string;
  audience_size: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMessageSuggestions, setShowMessageSuggestions] = useState(false);
  const [messageSuggestions, setMessageSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    segment_id: '',
    message_template: '',
    campaign_objective: '',
  });

  useEffect(() => {
    fetchCampaigns();
    fetchSegments();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const generateMessageSuggestions = async () => {
    if (!formData.campaign_objective.trim()) {
      toast.error('Please enter a campaign objective');
      return;
    }

    setAiLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const selectedSegment = segments.find(s => s.id === parseInt(formData.segment_id));
      const segmentDescription = selectedSegment ? selectedSegment.name : 'General customer segment';

      const response = await fetch(`${API_URL}/api/ai/message-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaignObjective: formData.campaign_objective,
          segmentDescription,
          tone: 'friendly',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessageSuggestions(data.suggestions);
        setShowMessageSuggestions(true);
      } else {
        toast.error('Failed to generate message suggestions');
      }
    } catch (error) {
      console.error('Message suggestions error:', error);
      toast.error('Failed to generate message suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    if (!formData.segment_id) {
      toast.error('Please select a segment');
      return;
    }

    if (!formData.message_template.trim()) {
      toast.error('Please enter a message template');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          segment_id: parseInt(formData.segment_id),
          message_template: formData.message_template,
        }),
      });

      if (response.ok) {
        toast.success('Campaign created and sending initiated!');
        setShowCreateForm(false);
        setFormData({
          name: '',
          description: '',
          segment_id: '',
          message_template: '',
          campaign_objective: '',
        });
        fetchCampaigns();
      } else {
        toast.error('Failed to create campaign');
      }
    } catch (error) {
      console.error('Create campaign error:', error);
      toast.error('Failed to create campaign');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      draft: 'badge-info',
      scheduled: 'badge-warning',
      sending: 'badge-warning',
      sent: 'badge-success',
      failed: 'badge-danger',
    };

    return (
      <span className={`badge ${statusClasses[status as keyof typeof statusClasses] || 'badge-info'}`}>
        {status}
      </span>
    );
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
              <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage marketing campaigns for your customer segments
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Campaign
            </button>
          </div>

          {/* Campaigns List */}
          <div className="grid grid-cols-1 gap-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{campaign.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Segment</p>
                        <p className="font-medium">{campaign.segment_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Audience Size</p>
                        <p className="font-medium">{campaign.audience_size}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Messages Sent</p>
                        <p className="font-medium">{campaign.sent_messages}/{campaign.total_messages}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Success Rate</p>
                        <p className="font-medium">
                          {campaign.total_messages > 0 
                            ? `${((campaign.sent_messages / campaign.total_messages) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </p>
                      </div>
                    </div>

                    {campaign.sent_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Sent on {new Date(campaign.sent_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <a
                      href={`/campaigns/${campaign.id}`}
                      className="btn btn-secondary text-sm"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View Details
                    </a>
                    <a
                      href={`/campaigns/${campaign.id}/stats`}
                      className="btn btn-primary text-sm"
                    >
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      Analytics
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {campaigns.length === 0 && (
            <div className="text-center py-12">
              <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first marketing campaign.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn btn-primary"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Campaign
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create Campaign Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Campaign</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input"
                      placeholder="e.g., Welcome Back Campaign"
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
                      placeholder="Describe the purpose of this campaign..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Segment
                    </label>
                    <select
                      value={formData.segment_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, segment_id: e.target.value }))}
                      className="input"
                    >
                      <option value="">Select a segment</option>
                      {segments.map((segment) => (
                        <option key={segment.id} value={segment.id}>
                          {segment.name} ({segment.audience_size} customers)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Campaign Objective
                    </label>
                    <input
                      type="text"
                      value={formData.campaign_objective}
                      onChange={(e) => setFormData(prev => ({ ...prev, campaign_objective: e.target.value }))}
                      className="input"
                      placeholder="e.g., Bring back inactive users, Promote new products"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Describe what you want to achieve with this campaign for AI message suggestions
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Message Template
                      </label>
                      <button
                        onClick={generateMessageSuggestions}
                        disabled={aiLoading || !formData.campaign_objective || !formData.segment_id}
                        className="btn btn-secondary text-sm"
                      >
                        {aiLoading ? 'Generating...' : '🤖 AI Suggestions'}
                      </button>
                    </div>
                    <textarea
                      value={formData.message_template}
                      onChange={(e) => setFormData(prev => ({ ...prev, message_template: e.target.value }))}
                      className="input"
                      rows={4}
                      placeholder="Hi {name}, here's your personalized message..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use {'{name}'} for personalization. Available: {'{name}'}, {'{email}'}, {'{total_spent}'}
                    </p>
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
                    onClick={createCampaign}
                    className="btn btn-primary"
                  >
                    Create & Send Campaign
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Suggestions Modal */}
        {showMessageSuggestions && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Message Suggestions</h3>
                
                <div className="space-y-4">
                  {messageSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, message_template: suggestion.template }));
                            setShowMessageSuggestions(false);
                          }}
                          className="btn btn-primary text-sm"
                        >
                          Use This
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{suggestion.template}</p>
                      <p className="text-xs text-gray-500">{suggestion.reasoning}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowMessageSuggestions(false)}
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
