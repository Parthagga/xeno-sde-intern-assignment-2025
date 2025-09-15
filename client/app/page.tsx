'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import {
  UsersIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalCustomers: number;
  totalOrders: number;
  totalSegments: number;
  totalCampaigns: number;
  recentCampaigns: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const [customersRes, ordersRes, segmentsRes, campaignsRes] = await Promise.all([
        fetch(`${API_URL}/api/customers?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/orders?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/segments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/campaigns?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [customersData, ordersData, segmentsData, campaignsData] = await Promise.all([
        customersRes.json(),
        ordersRes.json(),
        segmentsRes.json(),
        campaignsRes.json(),
      ]);

      setStats({
        totalCustomers: customersData.pagination?.total || 0,
        totalOrders: ordersData.pagination?.total || 0,
        totalSegments: segmentsData.segments?.length || 0,
        totalCampaigns: campaignsData.pagination?.total || 0,
        recentCampaigns: campaignsData.campaigns || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="animate-pulse">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const statCards = [
    {
      name: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: UsersIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: ShoppingBagIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Segments',
      value: stats?.totalSegments || 0,
      icon: ChartBarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Campaigns',
      value: stats?.totalCampaigns || 0,
      icon: EnvelopeIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome to your Mini CRM Platform. Here's an overview of your data.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <div key={stat.name} className="card">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Campaigns */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Campaigns</h2>
            {stats?.recentCampaigns.length ? (
              <div className="space-y-3">
                {stats.recentCampaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{campaign.name}</h3>
                      <p className="text-xs text-gray-500">
                        Segment: {campaign.segment_name} • Audience: {campaign.audience_size}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`badge ${
                        campaign.status === 'sent' ? 'badge-success' :
                        campaign.status === 'sending' ? 'badge-warning' :
                        campaign.status === 'failed' ? 'badge-danger' :
                        'badge-info'
                      }`}>
                        {campaign.status}
                      </span>
                      {campaign.sent_at && (
                        <span className="text-xs text-gray-500">
                          {new Date(campaign.sent_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first customer segment and campaign.
                </p>
                <div className="mt-6">
                  <a
                    href="/segments"
                    className="btn btn-primary"
                  >
                    Create Segment
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Import Customers</h3>
              <p className="text-xs text-gray-500 mb-4">
                Bulk import customer data using our API or CSV upload
              </p>
              <a href="/customers" className="btn btn-primary text-sm">
                View Customers
              </a>
            </div>
            
            <div className="card">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Create Segment</h3>
              <p className="text-xs text-gray-500 mb-4">
                Use AI-powered natural language to create customer segments
              </p>
              <a href="/segments" className="btn btn-primary text-sm">
                Create Segment
              </a>
            </div>
            
            <div className="card">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Launch Campaign</h3>
              <p className="text-xs text-gray-500 mb-4">
                Send personalized messages to your customer segments
              </p>
              <a href="/campaigns" className="btn btn-primary text-sm">
                Create Campaign
              </a>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
