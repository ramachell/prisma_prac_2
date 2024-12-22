import NextError from 'next/error';
import Link from 'next/link';
import { useRouter } from 'next/router';

import type { NextPageWithLayout } from '~/pages/_app';
import type { RouterOutput } from '~/utils/trpc';
import { trpc } from '~/utils/trpc';

type TodoByIdOutput = RouterOutput['todo']['byId'];

function TodoItem(props: { todo: TodoByIdOutput }) {
  const { todo } = props;
  return (
    <div className="flex flex-col justify-center h-full px-8 ">
      <Link className="text-gray-300 underline mb-4" href="/">
        Home
      </Link>
      <h1 className="text-4xl font-bold">{todo.title}</h1>
      <em className="text-gray-400">
        Created {todo.createdAt.toLocaleDateString('en-us')}
      </em>

      <h2 className="text-2xl font-semibold py-2">Raw data:</h2>
      <pre className="bg-gray-900 p-4 rounded-xl overflow-x-scroll">
        {JSON.stringify(todo, null, 4)}
      </pre>
    </div>
  );
}

const TodoViewPage: NextPageWithLayout = () => {
  const id = useRouter().query.id as string;
  const todoQuery = trpc.todo.byId.useQuery({ id });

  if (todoQuery.error) {
    return (
      <NextError
        title={todoQuery.error.message}
        statusCode={todoQuery.error.data?.httpStatus ?? 500}
      />
    );
  }

  if (todoQuery.status !== 'success') {
    return (
      <div className="flex flex-col justify-center h-full px-8 ">
        <div className="w-full bg-zinc-900/70 rounded-md h-10 animate-pulse mb-2"></div>
        <div className="w-2/6 bg-zinc-900/70 rounded-md h-5 animate-pulse mb-8"></div>

        <div className="w-full bg-zinc-900/70 rounded-md h-40 animate-pulse"></div>
      </div>
    );
  }
  const { data } = todoQuery;
  return <TodoItem todo={data} />;
};

export default TodoViewPage;
