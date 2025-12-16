import { Layout } from '../../components/Layout';

export const Dashboard = () => {
  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-accent mb-4">Dashboard</h1>
        <p className="text-secondary">Statistiques et données</p>
      </div>
    </Layout>
  );
};