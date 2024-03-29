import { getAuthSession } from "@/lib/auth"
import { SubredditSubscriptionValidator } from "@/lib/validators/subreddit"
import { db } from "@/lib/db"
import { z } from 'zod'

export async function POST(req: Request) {
    try {
        const session = await getAuthSession()

        if (!session?.user) {
            return new Response('Unauthorized', { status: 401 })
        }

      const body = await req.json()

      const { subredditId } = SubredditSubscriptionValidator.parse(body)

      const subscriptionExists = await db.subscription.findFirst({
        where: {
          subredditId,
          //  @ts-ignore
          userId: session.user.id,
        },
      })


      if (!subscriptionExists) {
        return new Response('You are not subscribed to this subreddit.', {
          status: 400,
        })
      }

      //   check if user is creator of the subreddit
      const subreddit = await db.subreddit.findFirst({
          where: {
            id: subredditId,
            //  @ts-ignore
            creatorId: session.user.id,
          },
      })

      if(subreddit) {
        return new Response('You cant unsubscribe from your own subreddit.', {
            status: 400,
        })
      }

      await db.subscription.delete({ 
          where: {
            userId_subredditId: {
                subredditId,
                //  @ts-ignore
                userId: session.user.id,
            },
          },
      })

      return new Response(subredditId)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response('Invalid POST request data passed', { status: 422 })
      }

      return new Response(
        'Could not unsubscribe from subreddit at this time, please try again later.',
        {
          status: 500,
        }
      )
    }
}