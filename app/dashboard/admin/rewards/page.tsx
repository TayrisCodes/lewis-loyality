'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { Gift, Plus, Edit, Trash2, Target } from 'lucide-react';

interface RewardRule {
  _id: string;
  visitsNeeded: number;
  rewardValue: string;
  storeId: string;
  createdAt: string;
}

export default function AdminRewardsPage() {
  const [rewardRules, setRewardRules] = useState<RewardRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [createRuleOpen, setCreateRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({ visitsNeeded: '', rewardValue: '' });

  useEffect(() => {
    fetchRewardRules();
  }, []);

  const fetchRewardRules = async () => {
    try {
      const response = await fetch('/api/admin/rewards/rules');
      if (response.ok) {
        const data = await response.json();
        setRewardRules(data);
      }
    } catch (error) {
      console.error('Error fetching reward rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/rewards/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitsNeeded: parseInt(ruleForm.visitsNeeded),
          rewardValue: ruleForm.rewardValue,
        }),
      });

      if (response.ok) {
        setCreateRuleOpen(false);
        setRuleForm({ visitsNeeded: '', rewardValue: '' });
        fetchRewardRules();
      }
    } catch (error) {
      console.error('Error creating reward rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this reward rule?')) return;

    try {
      const response = await fetch(`/api/admin/rewards/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRewardRules();
      }
    } catch (error) {
      console.error('Error deleting reward rule:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="admin" />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 lg:ml-64">
        <div className="p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center"
          >
            <div>
              <h1 className="text-3xl font-bold">Rewards Management</h1>
              <p className="text-gray-600 mt-1">Configure reward rules for your customers</p>
            </div>
            <Dialog open={createRuleOpen} onOpenChange={setCreateRuleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reward Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Reward Rule</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRule} className="space-y-4">
                  <div>
                    <Label htmlFor="visits-needed">Visits Needed</Label>
                    <Input
                      id="visits-needed"
                      type="number"
                      min="1"
                      value={ruleForm.visitsNeeded}
                      onChange={(e) => setRuleForm({ ...ruleForm, visitsNeeded: e.target.value })}
                      placeholder="e.g., 5"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reward-value">Reward Description</Label>
                    <Input
                      id="reward-value"
                      value={ruleForm.rewardValue}
                      onChange={(e) => setRuleForm({ ...ruleForm, rewardValue: e.target.value })}
                      placeholder="e.g., Free Coffee"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Create Rule</Button>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rewardRules.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Min Visits</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rewardRules.length > 0 ? Math.min(...rewardRules.map(r => r.visitsNeeded)) : 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Max Visits</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rewardRules.length > 0 ? Math.max(...rewardRules.map(r => r.visitsNeeded)) : 0}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reward Rules Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Reward Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visits Needed</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewardRules.map((rule) => (
                      <TableRow key={rule._id}>
                        <TableCell>
                          <Badge variant="outline">
                            {rule.visitsNeeded} visits
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {rule.rewardValue}
                        </TableCell>
                        <TableCell>
                          {new Date(rule.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteRule(rule._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {rewardRules.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No reward rules configured yet.</p>
                    <p className="text-sm">Create your first rule to start rewarding customers!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>How Rewards Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <h3 className="font-medium mb-1">Customer Visits</h3>
                    <p className="text-sm text-gray-600">Customers scan QR codes and accumulate visits</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-600 font-bold">2</span>
                    </div>
                    <h3 className="font-medium mb-1">Reach Threshold</h3>
                    <p className="text-sm text-gray-600">When visits match a rule, reward becomes available</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-purple-600 font-bold">3</span>
                    </div>
                    <h3 className="font-medium mb-1">Redeem Reward</h3>
                    <p className="text-sm text-gray-600">Customer redeems reward at your store</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}