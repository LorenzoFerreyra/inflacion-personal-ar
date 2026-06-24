import { Pagination } from 'inflacion-personal-ar';

export function Middle() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-xl">
      <Pagination page={4} totalPages={10} totalCount={193} onPageChange={() => {}} />
    </div>
  );
}

export function FirstPage() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-xl">
      <Pagination page={1} totalPages={8} totalCount={150} onPageChange={() => {}} />
    </div>
  );
}

export function LastPage() {
  return (
    <div className="bg-zinc-950 p-4 w-full max-w-xl">
      <Pagination page={8} totalPages={8} totalCount={150} onPageChange={() => {}} />
    </div>
  );
}
