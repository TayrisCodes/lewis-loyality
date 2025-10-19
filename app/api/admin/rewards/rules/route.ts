import { NextRequest, NextResponse } from 'next/server';
import RewardRule from '@/models/RewardRule';
import { requireAdmin, PERMISSIONS } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAdmin([PERMISSIONS.VIEW_REWARDS]);

    const rules = await RewardRule.find({ storeId: user.storeId });
    return NextResponse.json(rules);
  } catch (error) {
    console.error('Get reward rules error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin([PERMISSIONS.MANAGE_REWARDS]);
    const { visitsNeeded, rewardValue } = await request.json();

    if (!visitsNeeded || !rewardValue) {
      return NextResponse.json(
        { error: 'Visits needed and reward value are required' },
        { status: 400 }
      );
    }

    const rule = new RewardRule({
      storeId: user.storeId,
      visitsNeeded,
      rewardValue,
    });

    await rule.save();
    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Create reward rule error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}