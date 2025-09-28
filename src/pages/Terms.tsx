import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card rounded-3xl p-8 md:p-12 animate-fade-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center">
              Terms of Service
            </h1>
            
            <div className="prose prose-lg text-muted-foreground max-w-none">
              <p className="text-sm text-muted-foreground mb-8 text-center">
                Last updated: December 2024
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">1. Agreement to Terms</h2>
                <p>
                  By accessing and using Tingle, you accept and agree to be bound by the terms and 
                  provision of this agreement. This is a legal agreement between you and Tingle.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">2. Age Restrictions</h2>
                <p>
                  You must be at least 18 years old to use this platform. By using our service, 
                  you represent and warrant that you are of legal age to form a binding contract.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">3. User Accounts</h2>
                <p>
                  When you create an account with us, you must provide information that is accurate, 
                  complete, and current at all times. You are responsible for safeguarding the password 
                  and for maintaining the confidentiality of your account.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">4. Content Policy</h2>
                <p>
                  Our service allows you to post, link, store, share and otherwise make available 
                  certain information, text, graphics, videos, or other material. You are responsible 
                  for content that you post to the service, including its legality, reliability, and appropriateness.
                </p>
                <ul className="list-disc ml-6 mt-4">
                  <li>Content must comply with applicable laws</li>
                  <li>No harassment, hate speech, or discriminatory content</li>
                  <li>Respect intellectual property rights</li>
                  <li>No spam or misleading information</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">5. Creator Guidelines</h2>
                <p>
                  Creators on our platform must adhere to specific guidelines to maintain a safe 
                  and respectful environment for all users.
                </p>
                <ul className="list-disc ml-6 mt-4">
                  <li>Verify identity as required</li>
                  <li>Provide authentic and original content</li>
                  <li>Respect subscriber privacy and boundaries</li>
                  <li>Comply with payment and tax obligations</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">6. Payment Terms</h2>
                <p>
                  Paid subscriptions and tips are processed securely through our payment partners. 
                  All payments are final and non-refundable except as required by law.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">7. Privacy and Data</h2>
                <p>
                  Your privacy is important to us. Please review our Privacy Policy, which also 
                  governs your use of the service, to understand our practices.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">8. Prohibited Uses</h2>
                <p>You may not use our service:</p>
                <ul className="list-disc ml-6 mt-4">
                  <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                  <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                  <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                  <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                  <li>To submit false or misleading information</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">9. Termination</h2>
                <p>
                  We may terminate or suspend your account and bar access to the service immediately, 
                  without prior notice or liability, under our sole discretion, for any reason whatsoever 
                  and without limitation, including but not limited to a breach of the Terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">10. Changes to Terms</h2>
                <p>
                  We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                  If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">11. Contact Information</h2>
                <p>
                  If you have any questions about these Terms of Service, please contact us at:
                  <br />
                  <strong>legal@tingle.com</strong>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;