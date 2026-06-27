import {
  useGetGameStats,
  useGetInviteStats,
  useGetActiveVoiceChannels
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Gamepad2, Users, Mic, Trophy } from "lucide-react";

export default function Dashboard() {
  const { data: gameStats, isLoading: loadingGames } = useGetGameStats();
  const { data: inviteStats, isLoading: loadingInvites } = useGetInviteStats();
  const { data: voiceChannels, isLoading: loadingVoice } = useGetActiveVoiceChannels();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">System status and current bot activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Game Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hacker Wars Games</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingGames ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">{gameStats?.totalGames || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {gameStats?.activePlayers || 0} active players
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Win/Loss */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Ratio</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingGames ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">
                  {gameStats?.hackerWins || 0} / {gameStats?.defenderWins || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Hackers vs Defenders
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invite Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invites</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingInvites ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">{inviteStats?.totalInvites || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Top inviter: {inviteStats?.topInviter || 'None'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Voice Channels */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Voice</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingVoice ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">{voiceChannels?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Temp channels active
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
