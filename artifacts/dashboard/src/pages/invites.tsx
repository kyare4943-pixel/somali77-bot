import { useGetInvites, useGetInviteStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, UserMinus, UserX } from "lucide-react";

export default function Invites() {
  const { data: invites, isLoading: loadingInvites } = useGetInvites();
  const { data: stats, isLoading: loadingStats } = useGetInviteStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invite Tracker</h1>
        <p className="text-muted-foreground mt-1">Monitor server growth and top inviters.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invites</CardTitle>
            <UserPlusIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold">{stats?.totalInvites || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Inviter</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingStats ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold truncate" title={stats?.topInviter || 'None'}>
                {stats?.topInviter || 'None'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInvites ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !invites?.length ? (
            <div className="text-center py-10 text-muted-foreground">No invite data available.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right text-green-500">Regular</TableHead>
                    <TableHead className="text-right text-red-500">Left</TableHead>
                    <TableHead className="text-right text-yellow-500">Fake</TableHead>
                    <TableHead className="text-right font-bold">Total (Net)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => {
                    const net = invite.total - invite.left - invite.fake;
                    return (
                      <TableRow key={invite.userId}>
                        <TableCell className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={invite.avatarUrl || ''} />
                            <AvatarFallback>{invite.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{invite.username}</span>
                        </TableCell>
                        <TableCell className="text-right">{invite.total}</TableCell>
                        <TableCell className="text-right">{invite.left}</TableCell>
                        <TableCell className="text-right">{invite.fake}</TableCell>
                        <TableCell className="text-right font-bold">{net > 0 ? net : 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Just a quick inline icon replacement for user plus since it wasn't imported from lucide-react initially
function UserPlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  )
}
