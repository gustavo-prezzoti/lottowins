import React from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Briefcase, Landmark, Calendar, ShieldCheck } from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';

const InvestmentCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <Card variant="light" className="mb-3 p-3 rounded-lg">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-accent/10 rounded-lg flex items-center justify-center">{icon}</div>
      <div>
        <h3 className="font-semibold text-text-dark text-base">{title}</h3>
        <p className="text-text-muted text-sm mt-1">{description}</p>
      </div>
    </div>
  </Card>
);

const InvestmentsScreen: React.FC = () => {
  const { isMobile } = useWindowSize();

  // Mobile Layout
  const MobileInvestments = () => (
    <div className="min-h-screen bg-primary">
      <main className="px-3 py-4">
        <div className="bg-card p-4 rounded-lg mb-5">
          <h2 className="text-text-dark font-bold text-lg mb-2">Smart Investment Strategies</h2>
          <p className="text-text-muted text-sm">
            Discover expert advice for managing lottery winnings and building long-term wealth through strategic investments.
          </p>
        </div>
        <div className="space-y-5">
          <section>
            <h2 className="text-text font-semibold text-base mb-3">Essential Strategies</h2>
            <InvestmentCard
              icon={<Briefcase size={22} className="text-accent" />}
              title="Diversification is Key"
              description="Learn how to spread your winnings across different asset classes to minimize risk and maximize returns."
            />
            <InvestmentCard
              icon={<Landmark size={22} className="text-accent" />}
              title="Understanding Interest Rates"
              description="How changes in interest rates affect different types of investments and what it means for your portfolio."
            />
            <InvestmentCard
              icon={<Calendar size={22} className="text-accent" />}
              title="Long-term Planning"
              description="Setting up a sustainable financial plan that ensures your windfall lasts for generations."
            />
          </section>
          <section>
            <h2 className="text-text font-semibold text-base mb-3">Recommended Reading</h2>
            <Card variant="light" className="mb-3 p-3 rounded-lg">
              <h3 className="font-semibold text-text-dark text-base">The Psychology of Sudden Wealth</h3>
              <p className="text-text-muted text-sm mt-1">
                How to handle the emotional aspects of receiving a large sum of money and avoid common pitfalls.
              </p>
              <Button variant="outline" className="mt-3 w-full">Read Article</Button>
            </Card>
            <Card variant="light" className="mb-3 p-3 rounded-lg">
              <h3 className="font-semibold text-text-dark text-base">Tax Strategies for Lottery Winners</h3>
              <p className="text-text-muted text-sm mt-1">
                Understanding tax implications and legal structures to protect your winnings.
              </p>
              <Button variant="outline" className="mt-3 w-full">Read Article</Button>
            </Card>
          </section>
          <section>
            <div className="bg-primary border border-[#333333] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="text-accent mt-1" />
                <div>
                  <h4 className="font-medium text-text text-base">Financial Advisor Network</h4>
                  <p className="text-text/70 text-sm mt-1">
                    Connect with vetted financial advisors who specialize in lottery winnings and sudden wealth.
                  </p>
                  <Button className="mt-4 w-full">Find an Advisor</Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );

  // Desktop Layout
  const DesktopInvestments = () => (
    <div className="min-h-screen bg-primary flex">
      <div className="flex-1 flex flex-col">
        <main className="pt-12 pb-20 px-12 flex-1">
          <div className="max-w-6xl mx-auto w-full">
            <div className="bg-card p-10 rounded-2xl mb-10">
              <h2 className="text-text-dark font-bold text-2xl mb-2">Smart Investment Strategies</h2>
              <p className="text-text-muted text-base">
                Discover expert advice for managing lottery winnings and building long-term wealth through strategic investments.
              </p>
            </div>
            <div className="space-y-10">
              <section>
                <h2 className="text-text font-semibold text-xl mb-4">Essential Strategies</h2>
                <InvestmentCard
                  icon={<Briefcase size={28} className="text-accent" />}
                  title="Diversification is Key"
                  description="Learn how to spread your winnings across different asset classes to minimize risk and maximize returns."
                />
                <InvestmentCard
                  icon={<Landmark size={28} className="text-accent" />}
                  title="Understanding Interest Rates"
                  description="How changes in interest rates affect different types of investments and what it means for your portfolio."
                />
                <InvestmentCard
                  icon={<Calendar size={28} className="text-accent" />}
                  title="Long-term Planning"
                  description="Setting up a sustainable financial plan that ensures your windfall lasts for generations."
                />
              </section>
              <section>
                <h2 className="text-text font-semibold text-xl mb-4">Recommended Reading</h2>
                <Card variant="light" className="mb-4 p-7 rounded-xl">
                  <h3 className="font-semibold text-text-dark text-lg">The Psychology of Sudden Wealth</h3>
                  <p className="text-text-muted text-base mt-1">
                    How to handle the emotional aspects of receiving a large sum of money and avoid common pitfalls.
                  </p>
                  <Button variant="outline" className="mt-4">Read Article</Button>
                </Card>
                <Card variant="light" className="mb-4 p-7 rounded-xl">
                  <h3 className="font-semibold text-text-dark text-lg">Tax Strategies for Lottery Winners</h3>
                  <p className="text-text-muted text-base mt-1">
                    Understanding tax implications and legal structures to protect your winnings.
                  </p>
                  <Button variant="outline" className="mt-4">Read Article</Button>
                </Card>
              </section>
              <section>
                <div className="bg-primary border border-[#333333] rounded-xl p-10">
                  <div className="flex items-start gap-4">
                    <ShieldCheck size={24} className="text-accent mt-1" />
                    <div>
                      <h4 className="font-medium text-text text-lg">Financial Advisor Network</h4>
                      <p className="text-text/70 text-base mt-1">
                        Connect with vetted financial advisors who specialize in lottery winnings and sudden wealth.
                      </p>
                      <Button className="mt-6">Find an Advisor</Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  return isMobile ? <MobileInvestments /> : <DesktopInvestments />;
};

export default InvestmentsScreen;