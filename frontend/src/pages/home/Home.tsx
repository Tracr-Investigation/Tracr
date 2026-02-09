import { Layout } from '../../components/Layout';

export const Home = () => {
  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-accent mb-4">Welcome!</h1>
        <p className="text-secondary">Home page</p>
      </div>
    </Layout>
  );
};