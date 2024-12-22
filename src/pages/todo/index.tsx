import { trpc } from '../../utils/trpc';
import type { NextPageWithLayout } from '../_app';
import type { inferProcedureInput } from '@trpc/server';
import { Fragment } from 'react';
import type { AppRouter } from '~/server/routers/_app';

const IndexPage: NextPageWithLayout = () => {
  const utils = trpc.useUtils();
  const todosQuery = trpc.todo.list.useInfiniteQuery(
    {
      limit: 5,
    },
    {
      getNextPageParam(lastPage) {
        return lastPage.nextCursor;
      },
    },
  );

  const addTodo = trpc.todo.add.useMutation({
    async onSuccess() {
      await utils.todo.list.invalidate();
    },
  });

  const deleteTodo = trpc.todo.delete.useMutation({
    async onSuccess() {
      await utils.todo.list.invalidate();
    },
  });

  const toggleTodo = trpc.todo.toggle.useMutation({
    onMutate: async ({ id }) => {
      // 이전 데이터를 백업
      const previousData = utils.todo.list.getInfiniteData({ limit: 5 });
      
      // 낙관적으로 UI 업데이트
      utils.todo.list.setInfiniteData({ limit: 5 }, (old) => {
        if (!old) return { pages: [], pageParams: [] };
        
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id === id) {
                return { ...item, completed: !item.completed };
              }
              return item;
            }),
          })),
        };
      });

      return { previousData };
    },
    onError: (err, newTodo, context) => {
      // 에러 발생시 이전 데이터로 롤백
      if (context?.previousData) {
        utils.todo.list.setInfiniteData({ limit: 5 }, context.previousData);
      }
    },
    onSettled: async () => {
      // 서버와 동기화
      await utils.todo.list.invalidate();
    },
  });

  return (
    <div className="flex flex-col bg-gray-800 py-8">
      <h1 className="text-4xl font-bold">
        Todo 리스트
      </h1>

      <div className="flex flex-col py-8 items-start gap-y-2">
        <h2 className="text-3xl font-semibold">
          할 일 목록
          {todosQuery.status === 'pending' && '(로딩중...)'}
        </h2>

        <button
          className="bg-gray-900 p-2 rounded-md font-semibold disabled:bg-gray-700 disabled:text-gray-400"
          onClick={() => todosQuery.fetchNextPage()}
          disabled={!todosQuery.hasNextPage || todosQuery.isFetchingNextPage}
        >
          {todosQuery.isFetchingNextPage
            ? 'Loading more...'
            : todosQuery.hasNextPage
              ? 'Load More'
              : 'Nothing more to load'}
        </button>

        {todosQuery.data?.pages.map((page, index) => (
          <Fragment key={page.items[0]?.id || index}>
            {page.items.map((item) => (
              <article key={item.id} className="flex items-center gap-x-4">
                <input
                  type="checkbox"
                  checked={item.completed}
                  className="w-6 h-6 cursor-pointer"
                  onChange={() => toggleTodo.mutate({ id: item.id, completed: !item.completed })}
                />
                <h3 className={`text-2xl font-semibold ${
                  item.completed ? 'line-through text-gray-500' : ''
                }`}>
                  {item.title} 
                </h3>
                <button
                  className="bg-gray-900 p-2 rounded-md font-semibold disabled:bg-gray-700 disabled:text-gray-400"
                  onClick={() => deleteTodo.mutate({ id: item.id })}
                >
                  삭제
                </button>
              </article>
            ))}
          </Fragment>
        ))}
      </div>

      <hr />

      <div className="flex flex-col py-8 items-center">
        <h2 className="text-3xl font-semibold pb-2">새로운 할 일 추가</h2>

        <form
          className="py-2 w-4/6"
          onSubmit={async (e) => {
            e.preventDefault();
            const $form = e.currentTarget;
            const values = Object.fromEntries(new FormData($form));
            type Input = inferProcedureInput<AppRouter['todo']['add']>;
            
            const input: Input = {
              title: values.title as string,
              completed: values.completed === 'on',
            };
            try {
              await addTodo.mutateAsync(input);
              $form.reset();
            } catch (cause) {
              console.error({ cause }, 'Failed to add todo');
            }
          }}
        >
          <div className="flex flex-col gap-y-4 font-semibold">
            <div className="flex items-center gap-x-4">
              <input
                id="completed"
                name="completed"
                type="checkbox"
                className="w-6 h-6 cursor-pointer"
                disabled={addTodo.isPending}
              />
              <input
                className="flex-1 focus-visible:outline-dashed outline-offset-4 outline-2 outline-gray-700 rounded-xl px-4 py-3 bg-gray-900"
                id="title"
                name="title"
                type="text"
                placeholder="할 일을 입력하세요"
                disabled={addTodo.isPending}
              />
            </div>
            
            
            <div className="flex justify-center">
              <input
                className="cursor-pointer bg-gray-900 p-2 rounded-md px-16"
                type="submit"
                value="추가하기"
                disabled={addTodo.isPending}
              />
              {addTodo.error && (
                <p style={{ color: 'red' }}>{addTodo.error.message}</p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndexPage;

/**
 * If you want to statically render this page
 * - Export `appRouter` & `createContext` from [trpc].ts
 * - Make the `opts` object optional on `createContext()`
 *
 * @see https://trpc.io/docs/v11/ssg
 */
// export const getStaticProps = async (
//   context: GetStaticPropsContext<{ filter: string }>,
// ) => {
//   const ssg = createServerSideHelpers({
//     router: appRouter,
//     ctx: await createContext(),
//   });
//
//   await ssg.post.all.fetch();
//
//   return {
//     props: {
//       trpcState: ssg.dehydrate(),
//       filter: context.params?.filter ?? 'all',
//     },
//     revalidate: 1,
//   };
// };
